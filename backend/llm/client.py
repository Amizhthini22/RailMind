import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"

def query_llm(prompt: str, model: str = "llama3") -> str:
    """
    Queries the local Ollama instance with the given prompt.
    Fails loudly (raises a RuntimeError) if Ollama is offline or returns an error.
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    try:
        # Use a short timeout of 5 seconds to fail fast if Ollama is down
        response = requests.post(OLLAMA_URL, json=payload, timeout=5)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        # Fail loudly as required by the Definition of Done
        raise RuntimeError(f"CRITICAL: Ollama is offline or unreachable. Please start Ollama before running the demo. Details: {e}") from e
    
    try:
        result = response.json()
        return result.get("response", "")
    except Exception as e:
        raise RuntimeError(f"Failed to parse response from Ollama: {e}") from e
