# Physical Offline Demonstration Guide (Air-Gap Proof)

**Author / Maintainer:** Member D (DevOps & QA)  
**Target Audience:** Presenters, Judges, Evaluators, Technical Operators  
**Objective:** Prove conclusively that RailMind is 100% self-contained, locally executing, and operates with zero WAN or external cloud dependencies.

---

## 1. Architectural Air-Gap Audit Verification

Before running the physical demo, confirm the internal architecture:
- **LLM / Local Inference:** Ollama server listening on local loopback `http://localhost:11434` (or deterministic agent fallback). No OpenAI/Anthropic cloud API endpoints.
- **Frontend Assets:** All React/Vite dependencies, fonts, and Lucide icons are bundled locally in `node_modules` and compiled locally with zero CDN script/link tags.
- **Speech Subsystem:** Browser-native Web Speech Synthesis & Recognition API (`window.speechSynthesis` / `webkitSpeechRecognition`) + backend fuzzy parser.
- **Passenger Notifications:** Local simulated in-app telemetry feed (no external Twilio / WhatsApp cloud gateways).
- **Session Audit Chain:** SHA-256 black-box chain computed and persisted in memory/local JSON.

---

## 2. Pre-Demo Automated Verification Command

Run the automated offline verification script from your terminal:

```powershell
python infra/scripts/offline_check.py
```
*(On Linux/macOS: `./infra/scripts/offline_check.sh`)*

**Expected Output:**
```text
======================================================================
   RAILMIND OFFLINE DEMO PROOF & NETWORK ISOLATION AUDIT
======================================================================
[1/5] Network Firewall Guard: Active (All external WAN/DNS blocked)
[2/5] Testing Voice & Confirmation Subsystems (Local)...
      [PASS] STT / TTS / Multilingual Fuzzy Match: 100% Offline OK
[3/5] Testing Passenger Notification Channel (Simulated Feed)...
      [PASS] Simulated SMS/WhatsApp Channel: 100% Offline OK (Zero external telco API calls)
[4/5] Testing Core LangGraph Rescheduler & Contention Pipeline...
      [PASS] Agent Graph Execution: Completed in 7.76s
[5/5] Verifying SHA-256 Black-Box Audit Chain...
      [PASS] Audit Chain: Valid (6 records secured)
----------------------------------------------------------------------
[SUCCESS] ALL 5/5 OFFLINE CHECKS SUCCEEDED WITH ZERO EXTERNAL NETWORK CALLS!
   The RailMind stack is 100% self-contained and ready for offline live demo.
======================================================================
```

---

## 3. Live Physical Demonstration: Step-by-Step Script

Follow this exact sequence during your live presentation or judging walkthrough:

### Step 1: Start Backend & Frontend Locally
1. Start backend:
   ```powershell
   cd backend
   uvicorn main:app --reload --port 8001
   ```
2. Start frontend in a second terminal:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open Chrome/Edge at **`http://localhost:5173/`**.

---

### Step 2: Physically Disconnect the Internet (The "Pull-the-Plug" Moment)
1. Turn off your laptop's **Wi-Fi** (or toggle **Airplane Mode** / unplug the Ethernet cable).
2. Announce to the judges:
   > *"Notice that my laptop is now completely disconnected from the Internet. There is zero external network access."*
3. Open browser dev tools (`F12` $\rightarrow$ **Network tab**) to prove all outbound network requests stay on `localhost:8001` and `ws://localhost:8001/ws`.

---

### Step 3: Inject a Train Disruption Event
1. In the RailMind Dashboard, select:
   - **Delayed Train:** `22436 - Vande Bharat Express`
   - **Station:** `Kanpur Central (CNB)`
   - **Delay Duration:** `30 mins`
   - **Disruption Cause:** `Overhead equipment (OHE) power failure`
2. Click **"Inject Delay Event"**.

---

### Step 4: Show Real-Time Autonomous Rescheduling
1. Point to the **Agent Pipeline Telemetry**:
   - Delay Detector $\rightarrow$ Impact Analyzer $\rightarrow$ Contention Model (H5) $\rightarrow$ Dynamic Rescheduler $\rightarrow$ Multi-Lingual Notifier $\rightarrow$ Executive Reporter.
2. Show the **Baseline vs. RailMind Parallel Comparison Card**:
   - Highlights $178,500\text{ passenger-minutes saved}$.
   - Shows unmitigated cascade depth vs. RailMind zero-cascade mitigation.
3. Show the **Financial Liability Table**:
   - Calculated according to IRCTC Rule 4 (₹70,000 operational disruption allowance).

---

### Step 5: Test Voice Confirmation Gate & Announcements
1. Click the microphone icon or trigger a voice command:
   - Voice: *"Reschedule train 22436 to 10:30"*
2. Observe the **Confirmation Gate banner**:
   - Status transitions to `Waiting for confirmation (15s timeout)...`
3. Click **"Confirm"** (or say *"confirm"*):
   - Status executes immediately.
4. Listen to synthesized multilingual voice announcements in English, Hindi, Tamil, and Japanese.

---

### Step 6: Review Black-Box Session Replay & Scrubber
1. Switch to the **Session Replay** tab.
2. Drag the timeline slider back to Step 1 and hit **Play ($2\times$)**.
3. Point out the cryptographic hash chain verification: `Audit Chain: 100% VALID`.

---

## 4. Key Takeaways for Evaluators

1. **Deterministic Safety:** Zero external latency or cloud outage risk during railway emergencies.
2. **Data Privacy:** Sensitive operational telemetry and train schedules remain entirely on-premise.
3. **Fail-Safe Integrity:** Confirmation gate fails closed (aborts on silence), safeguarding against autonomous hallucination.
