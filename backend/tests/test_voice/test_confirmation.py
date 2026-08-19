import asyncio
import pytest
import sys
import os

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from voice.confirmation import ConfirmationGate, ConfirmationState

def test_confirm_executes_action():
    """Test 1: Explicit confirm transitions to EXECUTING and executes target callback."""
    gate = ConfirmationGate(default_timeout=5.0)
    executed = {"flag": False, "payload": None}

    async def sample_action(payload):
        executed["flag"] = True
        executed["payload"] = payload
        return {"status": "success", "train_id": payload.get("train_id")}

    async def run():
        # Request action
        req = await gate.request_action(
            action_id="act_001",
            action_type="reschedule_execute",
            payload={"train_id": "22436", "new_slot": "10:30"},
            on_execute=sample_action
        )
        assert req["success"] is True
        assert gate.state == ConfirmationState.PENDING_CONFIRMATION

        # Explicitly confirm
        res = await gate.confirm(action_id="act_001")
        assert res["success"] is True
        assert res["state"] == ConfirmationState.COMPLETED
        assert executed["flag"] is True
        assert executed["payload"]["train_id"] == "22436"
        assert res["result"]["status"] == "success"

    asyncio.run(run())

def test_explicit_cancel_aborts():
    """Test 2: Explicit cancel transitions to ABORTED and prevents action execution."""
    gate = ConfirmationGate(default_timeout=5.0)
    executed = {"flag": False}

    async def sample_action(payload):
        executed["flag"] = True

    async def run():
        req = await gate.request_action(
            action_id="act_002",
            action_type="escalate",
            payload={"level": "Critical"},
            on_execute=sample_action
        )
        assert req["success"] is True
        assert gate.state == ConfirmationState.PENDING_CONFIRMATION

        # Explicitly cancel
        res = await gate.cancel(action_id="act_002", reason="operator_declined")
        assert res["success"] is True
        assert res["state"] == ConfirmationState.ABORTED
        assert res["reason"] == "operator_declined"
        assert executed["flag"] is False
        assert gate.state == ConfirmationState.ABORTED

    asyncio.run(run())

def test_timeout_aborts_fail_closed():
    """
    Test 3 (Safety-Critical): Timeout defaults to abort, NOT execute, on silence.
    The system fails closed to protect train operations.
    """
    # Use short timeout (0.2s) for fast unit test
    gate = ConfirmationGate(default_timeout=0.2)
    executed = {"flag": False}

    async def sample_action(payload):
        executed["flag"] = True

    async def run():
        req = await gate.request_action(
            action_id="act_003",
            action_type="reschedule_execute",
            payload={"train_id": "12302", "delay_min": 45},
            timeout=0.2,
            on_execute=sample_action
        )
        assert req["success"] is True
        assert gate.state == ConfirmationState.PENDING_CONFIRMATION

        # Wait for timeout to expire (silence from operator)
        await asyncio.sleep(0.35)

        # Gate MUST be ABORTED, and execution MUST NOT have occurred
        assert gate.state == ConfirmationState.ABORTED
        assert gate.abort_reason == "timeout_expired"
        assert executed["flag"] is False

    asyncio.run(run())

def test_second_command_mid_confirmation_does_not_corrupt_state():
    """
    Test 4: A second command arriving while confirmation is pending
    is rejected and does not corrupt or overwrite the active pending confirmation.
    """
    gate = ConfirmationGate(default_timeout=5.0)
    executed_first = {"flag": False}
    executed_second = {"flag": False}

    async def first_action(payload):
        executed_first["flag"] = True

    async def second_action(payload):
        executed_second["flag"] = True

    async def run():
        # First command creates pending confirmation
        req1 = await gate.request_action(
            action_id="act_first",
            action_type="reschedule_execute",
            payload={"train_id": "22436"},
            on_execute=first_action
        )
        assert req1["success"] is True
        assert gate.active_action_id == "act_first"

        # Second command arrives while first is still pending
        req2 = await gate.request_action(
            action_id="act_second",
            action_type="escalate",
            payload={"level": "Major"},
            on_execute=second_action
        )
        assert req2["success"] is False
        assert "Another action is currently pending" in req2["error"]
        
        # Verify first action state was preserved intact
        assert gate.state == ConfirmationState.PENDING_CONFIRMATION
        assert gate.active_action_id == "act_first"
        assert gate.active_action_type == "reschedule_execute"

        # Confirm the first action
        confirm_res = await gate.confirm(action_id="act_first")
        assert confirm_res["success"] is True
        assert executed_first["flag"] is True
        assert executed_second["flag"] is False

    asyncio.run(run())
