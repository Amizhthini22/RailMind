import time
import uuid
from typing import Optional, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field

from voice.fuzzy_match import match_command, CommandIntent
from voice.stt import transcribe
from voice.tts import synthesize, AudioPayload, LanguageCode
from voice.confirmation import confirmation_gate, ConfirmationState

voice_router = APIRouter(prefix="/api/voice", tags=["Voice & Confirmation"])

class TranscribeRequest(BaseModel):
    audio: Optional[str] = None # Base64 audio or text
    transcript: Optional[str] = None
    language: str = "en"

class SynthesizeRequest(BaseModel):
    text: str
    language: LanguageCode = "en"

class VoiceCommandRequest(BaseModel):
    transcript: str
    language: str = "en"
    auto_execute_if_safe: bool = True

class ConfirmationActionRequest(BaseModel):
    action_id: Optional[str] = None
    reason: Optional[str] = None

class ManualActionRequest(BaseModel):
    action_type: str = "reschedule_execute"
    payload: Dict[str, Any]
    timeout_seconds: float = 15.0

@voice_router.post("/transcribe")
async def handle_transcribe(req: TranscribeRequest):
    """
    Unified STT endpoint for browser Speech Recognition API bridge.
    """
    input_data = req.transcript if req.transcript else req.audio
    text = transcribe(input_data or "")
    return {
        "success": True,
        "transcript": text,
        "language": req.language
    }

@voice_router.post("/synthesize", response_model=AudioPayload)
async def handle_synthesize(req: SynthesizeRequest):
    """
    Synthesize multilingual announcement/response text for browser Web Speech API.
    """
    payload = synthesize(text=req.text, lang=req.language)
    return payload

@voice_router.post("/command")
async def handle_voice_command(req: VoiceCommandRequest):
    """
    Process spoken command: perform multilingual fuzzy matching,
    extract slots, and intercept high-impact actions in the ConfirmationGate.
    """
    transcript = req.transcript
    lang = req.language
    
    intent, slots = match_command(transcript, lang=lang)
    
    # Check if this command is an explicit voice confirmation or cancellation
    if intent == CommandIntent.CONFIRM:
        res = await confirmation_gate.confirm()
        return {
            "intent": intent.value,
            "slots": slots,
            "confirmation": res,
            "spoken_response": "Action confirmed and executing." if res["success"] else "No action pending confirmation."
        }
        
    if intent == CommandIntent.CANCEL:
        res = await confirmation_gate.cancel(reason="voice_command_abort")
        return {
            "intent": intent.value,
            "slots": slots,
            "confirmation": res,
            "spoken_response": "Action cancelled." if res["success"] else "No action was pending."
        }

    # Action-triggering intents that MUST be gated behind ConfirmationGate
    if intent in [CommandIntent.RESCHEDULE, CommandIntent.ESCALATE]:
        action_id = f"act_{uuid.uuid4().hex[:8]}"
        gate_res = await confirmation_gate.request_action(
            action_id=action_id,
            action_type=intent.value,
            payload=slots,
            timeout=15.0
        )
        
        train_num = slots.get("train_id", "specified train")
        spoken_prompt = (
            f"Please confirm: {intent.value} for {train_num}. Say 'confirm' or 'cancel'."
            if intent == CommandIntent.RESCHEDULE
            else "Please confirm triggering operational escalation. Say 'confirm' or 'cancel'."
        )
        
        return {
            "intent": intent.value,
            "slots": slots,
            "requires_confirmation": True,
            "gate_status": gate_res,
            "spoken_prompt": spoken_prompt,
            "spoken_response": spoken_prompt
        }

    # Safe read-only / display intents
    response_messages = {
        CommandIntent.FOCUS_TRAIN: f"Focusing on train {slots.get('train_id', '')}.",
        CommandIntent.SHOW_DELAYS: "Displaying network delay overview.",
        CommandIntent.SHOW_SUBSTITUTION: "Showing standby relief train substitution pool.",
        CommandIntent.SHOW_AGENTS: "Showing autonomous pipeline agent telemetry and health.",
        CommandIntent.SHOW_METRICS: "Showing passenger delay impact and IRCTC cost metrics.",
        CommandIntent.SHOW_INCIDENTS: "Showing incident investigation report.",
        CommandIntent.SHOW_STATUS: "System operational. All watchdog monitors active.",
        CommandIntent.MUTE: "Voice audio muted.",
        CommandIntent.UNMUTE: "Voice audio unmuted.",
        CommandIntent.ENABLE_VOICE: "Voice recognition active. Listening for commands.",
        CommandIntent.UNKNOWN: "Command not recognized. Please repeat."
    }

    return {
        "intent": intent.value,
        "slots": slots,
        "requires_confirmation": False,
        "gate_status": confirmation_gate.get_status(),
        "spoken_response": response_messages.get(intent, "Command processed.")
    }

@voice_router.post("/confirm")
async def confirm_gate_action(req: Optional[ConfirmationActionRequest] = None):
    """
    Explicitly confirm pending safety-critical action.
    """
    action_id = req.action_id if req else None
    res = await confirmation_gate.confirm(action_id=action_id)
    if not res["success"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
    return res

@voice_router.post("/cancel")
async def cancel_gate_action(req: Optional[ConfirmationActionRequest] = None):
    """
    Explicitly cancel/abort pending safety-critical action.
    """
    action_id = req.action_id if req else None
    reason = req.reason if (req and req.reason) else "user_cancelled"
    res = await confirmation_gate.cancel(action_id=action_id, reason=reason)
    return res

@voice_router.get("/gate-status")
async def get_gate_status():
    """
    Get live status of ConfirmationGate.
    """
    return confirmation_gate.get_status()

@voice_router.post("/gate-reset")
async def reset_gate():
    """
    Reset ConfirmationGate to idle.
    """
    confirmation_gate.reset()
    return {"status": "Gate reset to idle."}
