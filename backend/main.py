import asyncio
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import json

from models import DelayEvent, Train, Station
from mock_data import TRAINS, STATIONS
from agents import app as graph_app

app = FastAPI(title="RailMind MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")

manager = ConnectionManager()

# Load announcements at startup
import os
ANNOUNCEMENTS_FILE = "announcements_log.json"
ANNOUNCEMENTS_LOG = []

def load_announcements():
    global ANNOUNCEMENTS_LOG
    if os.path.exists(ANNOUNCEMENTS_FILE):
        try:
            with open(ANNOUNCEMENTS_FILE, "r", encoding="utf-8") as f:
                ANNOUNCEMENTS_LOG = json.load(f)
        except Exception as e:
            print(f"Error loading announcements: {e}")
            ANNOUNCEMENTS_LOG = []
    else:
        ANNOUNCEMENTS_LOG = []

def save_announcements():
    try:
        with open(ANNOUNCEMENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(ANNOUNCEMENTS_LOG, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving announcements: {e}")

load_announcements()

@app.get("/api/initial-state")
async def get_initial_state():
    return {
        "trains": [t.dict() for t in TRAINS],
        "stations": [s.dict() for s in STATIONS]
    }

@app.get("/api/announcements")
async def get_announcements():
    return ANNOUNCEMENTS_LOG

@app.post("/api/clear-announcements")
async def clear_announcements():
    global ANNOUNCEMENTS_LOG
    ANNOUNCEMENTS_LOG = []
    save_announcements()
    return {"status": "Announcements log cleared"}

@app.post("/api/generate-announcement")
async def generate_announcement(event: DelayEvent):
    initial_state = {
        "delay_event": event,
        "logs": [],
        "reschedule_plan": {},
        "notifications": []
    }
    result = await graph_app.ainvoke(initial_state)
    announcements = [ann.dict() if hasattr(ann, 'dict') else ann for ann in result.get("announcements", [])]
    return {
        "severity": result.get("severity", "Minor"),
        "incident_explanation": result.get("incident_explanation"),
        "announcements": announcements
    }

@app.post("/api/inject-delay")
async def inject_delay(event: DelayEvent, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_agents, event)
    return {"status": "Delay injected. Agents are processing."}

async def run_agents(event: DelayEvent):
    initial_state = {
        "delay_event": event,
        "logs": [],
        "reschedule_plan": {},
        "notifications": []
    }
    
    # We will iterate through the graph and broadcast state updates
    async for output in graph_app.astream(initial_state):
        for node_name, state_update in output.items():
            if "logs" in state_update:
                for log in state_update["logs"]:
                    await manager.broadcast(json.dumps({
                        "type": "log",
                        "data": log.dict()
                    }))
            
            # If there's a reschedule plan, broadcast it
            if "reschedule_plan" in state_update:
                await manager.broadcast(json.dumps({
                    "type": "reschedule_plan",
                    "data": state_update["reschedule_plan"]
                }))

            if "severity" in state_update:
                await manager.broadcast(json.dumps({
                    "type": "severity",
                    "data": state_update["severity"]
                }))
                
            if "announcements" in state_update:
                serialized_anns = [ann.dict() if hasattr(ann, 'dict') else ann for ann in state_update["announcements"]]
                # Add to our local audit logs
                ANNOUNCEMENTS_LOG.extend(serialized_anns)
                save_announcements()
                
                await manager.broadcast(json.dumps({
                    "type": "announcements",
                    "data": serialized_anns
                }))
                
            if "incident_explanation" in state_update:
                await manager.broadcast(json.dumps({
                    "type": "incident_explanation",
                    "data": state_update["incident_explanation"]
                }))
                
            # If report is ready
            if "incident_report" in state_update:
                 await manager.broadcast(json.dumps({
                    "type": "report",
                    "data": state_update["incident_report"]
                }))
        
        await asyncio.sleep(0.5) # Slight pause to make the UI look like agents are "thinking"

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
