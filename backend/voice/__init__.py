"""
RailMind Voice & Localization Subsystem
"""
from .fuzzy_match import match_command, CommandIntent
from .stt import transcribe
from .tts import synthesize, AudioPayload
from .confirmation import ConfirmationGate, confirmation_gate

__all__ = [
    "match_command",
    "CommandIntent",
    "transcribe",
    "synthesize",
    "AudioPayload",
    "ConfirmationGate",
    "confirmation_gate",
]
