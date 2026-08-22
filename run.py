"""
RailMind Universal 1-Click Launcher
Runs both the FastAPI backend (port 8001) and Vite React frontend (port 5173).
"""

import os
import sys
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def print_banner():
    print("=" * 65)
    print("       🚆 RAILMIND AI OPERATIONS COMMAND CENTER")
    print("=" * 65)
    print(" Starting Backend (Port 8001) & Frontend (Port 5173)...")
    print("=" * 65)

def check_requirements():
    print("\n🔍 Checking environment...")
    # Check Python
    print(f"✓ Python: {sys.version.split()[0]}")
    
    # Check backend dependencies
    req_file = os.path.join(BACKEND_DIR, "requirements.txt")
    if os.path.exists(req_file):
        print("📦 Ensuring backend dependencies are installed...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", req_file])

    # Check frontend node_modules
    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules):
        print("📦 Installing frontend npm dependencies (this may take a minute)...")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, shell=True)

def main():
    print_banner()
    check_requirements()

    print("\n🚀 Launching RailMind Services...")

    # Start backend
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8001", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR)
    print("✓ Backend started at: http://127.0.0.1:8001 (API docs: http://127.0.0.1:8001/docs)")

    # Start frontend
    frontend_proc = subprocess.Popen(["npm", "run", "dev"], cwd=FRONTEND_DIR, shell=True)
    print("✓ Frontend started at: http://localhost:5173")

    print("\n" + "=" * 65)
    print(" 🌟 RailMind is LIVE!")
    print(" Open in your browser: http://localhost:5173")
    print(" Demo Login: controller / controller123  (or click 1-Click Demo buttons)")
    print(" Press CTRL+C to stop all services.")
    print("=" * 65 + "\n")

    def signal_handler(sig, frame):
        print("\n🛑 Shutting down RailMind services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
