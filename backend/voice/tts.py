from typing import Literal, Optional, Dict, Any
from pydantic import BaseModel, Field

LanguageCode = Literal["en", "ta", "hi", "ja"]

VOICE_CONFIGS = {
    "en": {
        "locale": "en-IN",
        "voice_name": "Google English India / Samantha",
        "rate": 1.0,
        "pitch": 1.0
    },
    "hi": {
        "locale": "hi-IN",
        "voice_name": "Google हिन्दी / Lekha",
        "rate": 0.95,
        "pitch": 1.0
    },
    "ta": {
        "locale": "ta-IN",
        "voice_name": "Google தமிழ் / Valluvar",
        "rate": 0.95,
        "pitch": 1.0
    },
    "ja": {
        "locale": "ja-JP",
        "voice_name": "Google 日本語 / Kyoko",
        "rate": 1.0,
        "pitch": 1.0
    }
}

class AudioPayload(BaseModel):
    text: str
    lang: str
    locale: str
    voice_name: str
    rate: float = 1.0
    pitch: float = 1.0
    audio_format: str = "browser_speech_synthesis"
    audio_base64: Optional[str] = None
    ssml: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

def synthesize(text: str, lang: LanguageCode = "en") -> AudioPayload:
    """
    Synthesize text to an AudioPayload structured for the frontend Web Speech API
    or local audio playback bridge.
    """
    clean_lang = lang.lower().split("-")[0] if "-" in lang else lang.lower()
    if clean_lang not in VOICE_CONFIGS:
        clean_lang = "en"
        
    cfg = VOICE_CONFIGS[clean_lang]
    
    # Generate structured SSML payload
    ssml = f"<speak><lang xml:lang='{cfg['locale']}'>{text}</lang></speak>"
    
    return AudioPayload(
        text=text,
        lang=clean_lang,
        locale=cfg["locale"],
        voice_name=cfg["voice_name"],
        rate=cfg["rate"],
        pitch=cfg["pitch"],
        audio_format="browser_speech_synthesis",
        audio_base64=None,
        ssml=ssml,
        metadata={
            "char_count": len(text),
            "estimated_duration_sec": round(len(text.split()) * 0.4, 2)
        }
    )
