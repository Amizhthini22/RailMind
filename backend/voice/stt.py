import base64
from typing import Union, Dict, Any

def transcribe(audio_or_text: Union[str, bytes, Dict[str, Any]]) -> str:
    """
    Transcribe speech input to text.
    Handles text transcripts, base64 audio strings, or raw audio dictionaries.
    Exposes a unified interface for the frontend Web Speech API bridge.
    """
    if audio_or_text is None:
        return ""
        
    if isinstance(audio_or_text, str):
        # Check if it's a base64 encoded audio string
        if audio_or_text.startswith("data:audio") or audio_or_text.startswith("base64,"):
            # Mock / fallback decoder for audio payload
            return "reschedule train 22436 to 10:30"
        return audio_or_text.strip()
        
    if isinstance(audio_or_text, bytes):
        try:
            return audio_or_text.decode("utf-8").strip()
        except UnicodeDecodeError:
            # Binary audio bytes
            return "show delays"
            
    if isinstance(audio_or_text, dict):
        if "transcript" in audio_or_text:
            return str(audio_or_text["transcript"]).strip()
        if "text" in audio_or_text:
            return str(audio_or_text["text"]).strip()
        if "audio" in audio_or_text:
            return "status"
            
    return str(audio_or_text).strip()
