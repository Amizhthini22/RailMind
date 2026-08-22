import os
import json
import time
import requests
from typing import Optional

class LLMUnavailableError(Exception):
    """Raised when the local Ollama LLM endpoint is unreachable or fails persistently."""
    pass

DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3.1"

def generate(prompt: str, system: Optional[str] = None, json_mode: bool = False) -> str:
    """
    Wraps Ollama's local API for Llama 3.1.
    
    :param prompt: The input prompt string.
    :param system: Optional system instructions prompt.
    :param json_mode: If True, requests JSON format and validates response is parseable JSON.
    :return: The generated text response string.
    :raises LLMUnavailableError: If Ollama is offline or unreachable after max retries.
    :raises ValueError: If json_mode is True and the response cannot be parsed as JSON.
    """
    ollama_url = os.getenv("OLLAMA_URL", DEFAULT_OLLAMA_URL)
    model_name = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    
    formatted_prompt = prompt
    if json_mode:
        if "JSON" not in prompt.upper():
            formatted_prompt = f"{prompt}\n\nIMPORTANT: Respond ONLY with valid JSON."
            
    payload = {
        "model": model_name,
        "prompt": formatted_prompt,
        "stream": False
    }
    
    if system:
        payload["system"] = system
        
    if json_mode:
        payload["format"] = "json"
        
    max_retries = 2
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            # Short timeout of 5s to fail fast if endpoint is down
            response = requests.post(ollama_url, json=payload, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            response_text = data.get("response", "").strip()
            
            if json_mode:
                # Validate that response is parseable JSON
                try:
                    json.loads(response_text)
                except json.JSONDecodeError as json_err:
                    # Try extracting JSON object/array if wrapped in extra text or markdown
                    start_dict = response_text.find('{')
                    end_dict = response_text.rfind('}')
                    start_arr = response_text.find('[')
                    end_arr = response_text.rfind(']')
                    
                    extracted = None
                    if start_dict != -1 and end_dict != -1 and end_dict > start_dict:
                        extracted = response_text[start_dict:end_dict + 1]
                    elif start_arr != -1 and end_arr != -1 and end_arr > start_arr:
                        extracted = response_text[start_arr:end_arr + 1]
                        
                    if extracted:
                        try:
                            json.loads(extracted)
                            return extracted
                        except json.JSONDecodeError:
                            pass
                            
                    raise ValueError(f"LLM output for json_mode could not be parsed as valid JSON: {response_text}") from json_err
                    
            return response_text
            
        except (requests.exceptions.RequestException, TimeoutError) as req_err:
            last_exception = req_err
            if attempt < max_retries:
                backoff_time = 0.5 * (2 ** attempt)
                time.sleep(backoff_time)
            else:
                raise LLMUnavailableError(
                    f"CRITICAL: Local Ollama LLM service is unreachable at {ollama_url}. "
                    f"Failed after {max_retries + 1} attempts. Details: {req_err}"
                ) from req_err
        except ValueError:
            # Re-raise JSON validation errors directly
            raise
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                backoff_time = 0.5 * (2 ** attempt)
                time.sleep(backoff_time)
            else:
                raise LLMUnavailableError(
                    f"Unexpected error communicating with Ollama at {ollama_url}: {e}"
                ) from e
