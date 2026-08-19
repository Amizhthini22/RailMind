import asyncio
import time
from enum import Enum
from typing import Optional, Dict, Any, Callable, Awaitable

class ConfirmationState(str, Enum):
    IDLE = "idle"
    PENDING_CONFIRMATION = "pending_confirmation"
    EXECUTING = "executing"
    ABORTED = "aborted"
    COMPLETED = "completed"

class ConfirmationGate:
    """
    Safety-Critical Gate for Intercepting High-Impact Voice & System Actions.
    Enforces a strict state machine with fail-closed timeout logic:
    pending_confirmation -> (confirm) -> executing -> completed
    pending_confirmation -> (cancel / timeout) -> aborted
    """
    def __init__(self, default_timeout: float = 15.0):
        self.default_timeout = default_timeout
        self.state: ConfirmationState = ConfirmationState.IDLE
        self.active_action_id: Optional[str] = None
        self.active_action_type: Optional[str] = None
        self.active_payload: Optional[Dict[str, Any]] = None
        self.created_at: float = 0.0
        self.expires_at: float = 0.0
        self.abort_reason: Optional[str] = None
        self._timer_task: Optional[asyncio.Task] = None
        self._execution_callback: Optional[Callable[[Dict[str, Any]], Awaitable[Any]]] = None
        self._broadcast_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None

    def set_broadcast_callback(self, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        """Set callback for broadcasting WebSocket status events."""
        self._broadcast_callback = callback

    async def _emit_state(self, message: str = ""):
        """Emit state update via the registered broadcast callback."""
        if self._broadcast_callback:
            payload = {
                "type": "confirmation_state_change",
                "data": {
                    "state": self.state.value,
                    "action_id": self.active_action_id,
                    "action_type": self.active_action_type,
                    "message": message,
                    "time_remaining_sec": max(0.0, round(self.expires_at - time.time(), 1)) if self.expires_at > 0 else 0,
                    "abort_reason": self.abort_reason
                }
            }
            try:
                if asyncio.iscoroutinefunction(self._broadcast_callback):
                    await self._broadcast_callback(payload)
                else:
                    self._broadcast_callback(payload)
            except Exception:
                pass

    async def request_action(
        self,
        action_id: str,
        action_type: str,
        payload: Dict[str, Any],
        timeout: Optional[float] = None,
        on_execute: Optional[Callable[[Dict[str, Any]], Awaitable[Any]]] = None
    ) -> Dict[str, Any]:
        """
        Request approval for an action.
        If a confirmation is already pending, rejects the new request without corrupting current state.
        """
        if self.state == ConfirmationState.PENDING_CONFIRMATION:
            return {
                "success": False,
                "error": "Another action is currently pending confirmation.",
                "pending_action_id": self.active_action_id,
                "state": self.state.value
            }

        timeout_sec = timeout if timeout is not None else self.default_timeout
        self.state = ConfirmationState.PENDING_CONFIRMATION
        self.active_action_id = action_id
        self.active_action_type = action_type
        self.active_payload = payload
        self.created_at = time.time()
        self.expires_at = self.created_at + timeout_sec
        self.abort_reason = None
        self._execution_callback = on_execute

        # Cancel any previous timer
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

        # Start fail-closed timeout task
        self._timer_task = asyncio.create_task(self._timeout_watchdog(timeout_sec, action_id))

        await self._emit_state(f"Waiting for explicit voice or UI confirmation for {action_type} ({action_id})...")
        
        return {
            "success": True,
            "state": self.state.value,
            "action_id": action_id,
            "action_type": action_type,
            "timeout_seconds": timeout_sec,
            "message": f"Action {action_type} requires explicit confirmation within {timeout_sec}s."
        }

    async def _timeout_watchdog(self, duration: float, target_action_id: str):
        """Fail-closed timeout: automatically aborts if no explicit confirmation received."""
        try:
            await asyncio.sleep(duration)
            if self.state == ConfirmationState.PENDING_CONFIRMATION and self.active_action_id == target_action_id:
                await self.abort(reason="timeout_expired")
        except asyncio.CancelledError:
            pass

    async def confirm(self, action_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Operator confirms pending action.
        Transitions state: pending_confirmation -> executing -> completed.
        """
        if self.state != ConfirmationState.PENDING_CONFIRMATION:
            return {
                "success": False,
                "error": f"Cannot confirm: Gate is in '{self.state.value}' state, not pending_confirmation.",
                "state": self.state.value
            }

        if action_id and self.active_action_id and action_id != self.active_action_id:
            return {
                "success": False,
                "error": f"Action ID mismatch: Expected {self.active_action_id}, got {action_id}.",
                "state": self.state.value
            }

        # Cancel timeout timer
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

        self.state = ConfirmationState.EXECUTING
        await self._emit_state("Confirmation received. Executing action...")

        result = None
        if self._execution_callback:
            try:
                if asyncio.iscoroutinefunction(self._execution_callback):
                    result = await self._execution_callback(self.active_payload or {})
                else:
                    result = self._execution_callback(self.active_payload or {})
            except Exception as e:
                self.state = ConfirmationState.ABORTED
                self.abort_reason = f"Execution failed: {str(e)}"
                await self._emit_state(f"Action execution encountered error: {str(e)}")
                return {
                    "success": False,
                    "error": str(e),
                    "state": self.state.value,
                    "action_id": self.active_action_id
                }

        self.state = ConfirmationState.COMPLETED
        await self._emit_state(f"Action {self.active_action_type} executed successfully.")
        
        executed_id = self.active_action_id
        return {
            "success": True,
            "state": self.state.value,
            "action_id": executed_id,
            "result": result
        }

    async def cancel(self, action_id: Optional[str] = None, reason: str = "operator_cancelled") -> Dict[str, Any]:
        """Explicit operator cancellation."""
        return await self.abort(action_id=action_id, reason=reason)

    async def abort(self, action_id: Optional[str] = None, reason: str = "aborted") -> Dict[str, Any]:
        """
        Abort pending action (fail-closed).
        """
        if self.state != ConfirmationState.PENDING_CONFIRMATION:
            return {
                "success": False,
                "error": f"Gate is not in pending_confirmation state (current: {self.state.value}).",
                "state": self.state.value
            }

        if action_id and self.active_action_id and action_id != self.active_action_id:
            return {
                "success": False,
                "error": f"Action ID mismatch: Expected {self.active_action_id}, got {action_id}.",
                "state": self.state.value
            }

        # Cancel timer
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

        self.state = ConfirmationState.ABORTED
        self.abort_reason = reason
        await self._emit_state(f"Action aborted: {reason}")
        
        aborted_id = self.active_action_id
        return {
            "success": True,
            "state": self.state.value,
            "action_id": aborted_id,
            "reason": reason
        }

    def reset(self):
        """Reset gate to IDLE state."""
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        self.state = ConfirmationState.IDLE
        self.active_action_id = None
        self.active_action_type = None
        self.active_payload = None
        self.created_at = 0.0
        self.expires_at = 0.0
        self.abort_reason = None
        self._execution_callback = None

    def get_status(self) -> Dict[str, Any]:
        """Retrieve current gate state and telemetry."""
        now = time.time()
        time_rem = max(0.0, round(self.expires_at - now, 1)) if (self.state == ConfirmationState.PENDING_CONFIRMATION and self.expires_at > 0) else 0.0
        return {
            "state": self.state.value,
            "active_action_id": self.active_action_id,
            "active_action_type": self.active_action_type,
            "active_payload": self.active_payload,
            "time_remaining_sec": time_rem,
            "is_pending": self.state == ConfirmationState.PENDING_CONFIRMATION,
            "abort_reason": self.abort_reason
        }

# Global singleton instance
confirmation_gate = ConfirmationGate(default_timeout=15.0)
