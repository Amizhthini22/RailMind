# 🚆 RailMind — AI Railway Operations & Rescheduling Command Center

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

RailMind is an agentic AI operations platform designed for Indian Railways section controllers and station masters. It features a physics-based **Digital Twin** of the 1,521 km Golden Trunk corridor (`NDLS` to `HWH`), a **Reinforcement Learning (RL) Rescheduler Agent** that avoids real platform collisions and block headway breaches, an interactive **Network Topology OCC Board**, a **Conflict Resolver Visual Storyboard**, **Multilingual Voice Commands**, and a tamper-evident **SHA-256 Audit Log Chain**.

---

## ⚡ Quickstart (Run in 1 Minute on Any Device)

### Prerequisites
- **Python 3.10+** ([Download Python](https://www.python.org/downloads/))
- **Node.js 18+** ([Download Node.js](https://nodejs.org/))
- **Git** ([Download Git](https://git-scm.com/))

---

### Option A: 1-Click Launch (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Amizhthini22/RailMind.git
   cd RailMind
   ```

2. **Run on Windows:**
   Double-click `start.bat`  
   *(or in PowerShell / CMD: `python run.py`)*

3. **Run on macOS / Linux:**
   ```bash
   chmod +x start.sh
   ./start.sh
   # or: python3 run.py
   ```

4. **Open your browser:**
   👉 **[http://localhost:5173](http://localhost:5173)**

---

### Option B: Manual Setup (2 Terminals)

#### Terminal 1: Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
*Backend API Docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)*

#### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend URL: [http://localhost:5173](http://localhost:5173)*

---

## 🔑 Demo Login Accounts

You can click any of the **1-Click Quick Demo Sign In** buttons on the login screen or use these credentials:

| Role | Username | Password | Access & Permissions |
| :--- | :--- | :--- | :--- |
| **Chief OCC Controller** | `controller` | `controller123` | Full control, delay injection, rescheduling, agent overrides |
| **Station Master** | `station_master` | `sm123` | Platform oversight, voice commands, local station monitoring |
| **System Admin** | `admin` | `admin123` | Full system administrator access |
| **Operations Auditor** | `viewer` | `viewer123` | Read-only access, audit log chain inspection, session replays |

---

## 🌟 Key Features & Architecture

```
                               ┌─────────────────────────┐
                               │   Vite + React Frontend │
                               │  (Dashboard, OCC Board) │
                               └────────────┬────────────┘
                                            │ HTTP / WebSocket (:8001)
                               ┌────────────▼────────────┐
                               │   FastAPI Orchestrator  │
                               └────────────┬────────────┘
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
   ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
   │ LangGraph Multi-Agent │    │  Physics Digital Twin │    │   RL Q-Learning Agent │
   │ • Delay Detector      │    │  • 6 Stations (78 PFs)│    │  • Physical Actions   │
   │ • Bottleneck Analyzer │    │  • 21 Siding Loops    │    │  • Head-to-Head Arena │
   │ • Rescheduler Agent   │    │  • 52 ABS Blocks      │    │  • 0 Platform Clashes │
   │ • SHA-256 Audit Log   │    │  • 600m Train Limits  │    │  • +166h Delay Saved  │
   └───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

1. **🛰️ Physical Digital Twin (`backend/digital_twin/`):**
   - Models physical platforms (`NDLS` 16 PFs, `CNB` 10 PFs, `PRYJ` 10 PFs, `BSB` 9 PFs, `PNBE` 10 PFs, `HWH` 23 PFs), siding loop tracks, and 52 Automatic Block Signal (ABS) sections across 1,521 km.
   - Enforces **Exclusive Platform Occupancy** (preventing 2 trains on 1 platform) and **5-minute safety headway rules**.

2. **🧠 Reinforcement Learning Rescheduler (`backend/rl_rescheduler/`):**
   - Q-Learning agent trained over 600+ disruption scenarios.
   - Solves railway disruptions using physical actions: Siding loop overtakes, platform reallocations, speed regulation (110-130 km/h), and standby relief dispatch.
   - Prevents cascading gridlock with **0 physical platform collisions** compared to 2 in the baseline formula.

3. **🗺️ Network Topology OCC Board:**
   - Double-track UP / DOWN main lines with live signal aspect lamps (🟢 Green / 🟡 Caution / 🔴 Danger).
   - Real-time animated train position beams and interactive station node inspector.

4. **📖 Conflict Resolver (AI vs. Rule):**
   - Visual storyboard showing why naive arithmetic delay formulas fail (clashing on Platform 1) and how RailMind AI shifts berths to Platform 3 and holds trains on loops.

5. **🎙️ Multilingual Voice Command Studio:**
   - Supports natural voice control in 🇺🇸 **English**, 🇮🇳 **Hindi**, and 🇯🇵 **Japanese** using Web Speech API & Neural Text-to-Speech (TTS).
   - Accessible via dedicated sidebar tab or floating quick mic button.

6. **🔒 Cryptographic Audit Chain:**
   - Every rescheduling decision and message is hashed with SHA-256 in a blockchain-style immutable ledger.

---

## 🛠️ Troubleshooting

- **Port Conflict (Port 8001 or 5173 already in use):**
  Kill any lingering background processes:
  - Windows: `taskkill /F /IM python.exe` and `taskkill /F /IM node.exe`
  - Linux/Mac: `fuser -k 8001/tcp 5173/tcp`
- **Audio Announcements:**
  Ensure browser microphone/audio permissions are enabled in your browser settings.
- **Frontend can't reach backend:**
  The frontend automatically tries port `8001`, then falls back to `8000`. Ensure backend is running with `python run.py`.

---

## 📄 License
This project is open-source under the MIT License.
