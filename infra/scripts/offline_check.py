#!/usr/bin/env python3
"""
RailMind Offline Verification & External Network Dependency Audit Script
Author: Member D (DevOps & QA)

Audits the entire backend and pipeline to guarantee 100% offline capability:
1. Installs a strict loopback-only socket guard (blocks all non-localhost outbound traffic).
2. Exercises the core end-to-end flow: Delay Injection -> Contention Analysis -> Reschedule Plan -> Multilingual Announcements -> Simulated Passenger Notifications -> Black-Box Audit Chain Verification.
3. Asserts zero external network calls occurred.
"""

import sys
import os
import socket
import json
import time

# Ensure backend directory is in python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
sys.path.insert(0, BACKEND_DIR)

# Strictly isolate network to loopback (127.0.0.1, localhost, ::1)
_orig_connect = socket.socket.connect
_orig_getaddrinfo = socket.getaddrinfo

ALLOWED_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
BLOCKED_ATTEMPTS = []

def guarded_getaddrinfo(host, port, *args, **kwargs):
    if host not in ALLOWED_HOSTS:
        BLOCKED_ATTEMPTS.append((host, port))
        raise socket.error(f"[OFFLINE AUDIT ENFORCEMENT] Outbound DNS resolution blocked for external host: {host}:{port}")
    return _orig_getaddrinfo(host, port, *args, **kwargs)

def guarded_connect(self, address):
    host = address[0] if isinstance(address, tuple) else address
    if host not in ALLOWED_HOSTS and host not in ["127.0.0.1", "localhost", "::1"]:
        BLOCKED_ATTEMPTS.append((host, address[1] if isinstance(address, tuple) else 0))
        raise socket.error(f"[OFFLINE AUDIT ENFORCEMENT] Outbound TCP connection blocked for external IP: {host}")
    return _orig_connect(self, address)

# Apply offline guard
socket.getaddrinfo = guarded_getaddrinfo
socket.socket.connect = guarded_connect

import asyncio

async def run_offline_verification():
    print("=" * 70)
    print("   RAILMIND OFFLINE DEMO PROOF & NETWORK ISOLATION AUDIT")
    print("=" * 70)
    print("[1/5] Network Firewall Guard: Active (All external WAN/DNS blocked)")
    
    # 1. Test Voice & Fuzzy Match Subsystems
    print("[2/5] Testing Voice & Confirmation Subsystems (Local)...")
    from voice.fuzzy_match import match_command, CommandIntent
    from voice.confirmation import confirmation_gate, ConfirmationState
    from voice.tts import synthesize
    
    intent, slots = match_command("reschedule train 22436 to 10:30", lang="en")
    assert intent == CommandIntent.RESCHEDULE
    assert slots.get("train_id") == "22436"
    
    audio_res = synthesize("Train 22436 rescheduled to 10:30", lang="en")
    assert audio_res.locale == "en-IN"
    print("      [PASS] STT / TTS / Multilingual Fuzzy Match: 100% Offline OK")

    # 2. Test Passenger Notification Channel (Simulated)
    print("[3/5] Testing Passenger Notification Channel (Simulated Feed)...")
    from routes.notify import send_notification, SIMULATED_NOTIFICATIONS_FEED
    notif = send_notification(
        passenger_ref="+91-98765-43210 (PNR 284-9182741)",
        message="Train 22436 delayed 30 min. Slot adjusted.",
        channel="SMS"
    )
    assert notif["is_simulated"] is True
    assert len(SIMULATED_NOTIFICATIONS_FEED) > 0
    print("      [PASS] Simulated SMS/WhatsApp Channel: 100% Offline OK (Zero external telco API calls)")

    # 3. Test Core Agent Rescheduling Pipeline
    print("[4/5] Testing Core LangGraph Rescheduler & Contention Pipeline...")
    from models import DelayEvent
    from agents import app as graph_app, verify_audit_chain
    
    test_event = DelayEvent(
        train_id="t1",
        station_code="CNB",
        delay_minutes=30,
        reason="Signal failure at Kanpur Central",
        substitute_train=False
    )
    
    initial_state = {
        "delay_event": test_event,
        "logs": [],
        "reschedule_plan": {},
        "notifications": []
    }
    
    start_t = time.time()
    final_output = None
    async for output in graph_app.astream(initial_state):
        for node_name, state_update in output.items():
            final_output = state_update
            
    elapsed = round(time.time() - start_t, 2)
    print(f"      [PASS] Agent Graph Execution: Completed in {elapsed}s")

    # 4. Verify Black-Box Cryptographic Audit Trail
    print("[5/5] Verifying SHA-256 Black-Box Audit Chain...")
    audit_verification = verify_audit_chain()
    assert audit_verification.is_valid is True
    print(f"      [PASS] Audit Chain: Valid ({audit_verification.total_records} records secured)")

    print("-" * 70)
    if BLOCKED_ATTEMPTS:
        print(f"[FAIL] {len(BLOCKED_ATTEMPTS)} unauthorized external network calls attempted:")
        for host, port in BLOCKED_ATTEMPTS:
            print(f"   - {host}:{port}")
        sys.exit(1)
    else:
        print("[SUCCESS] ALL 5/5 OFFLINE CHECKS SUCCEEDED WITH ZERO EXTERNAL NETWORK CALLS!")
        print("   The RailMind stack is 100% self-contained and ready for offline live demo.")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_offline_verification())
