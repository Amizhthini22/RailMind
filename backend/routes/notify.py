import time
import uuid
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field

notify_router = APIRouter(prefix="/api/notify", tags=["Passenger Notifications (Simulated)"])

# In-memory buffer for simulated passenger notifications feed
SIMULATED_NOTIFICATIONS_FEED: List[Dict[str, Any]] = []

# Optional callback for broadcasting to WebSocket subscribers
_broadcast_callback = None

def set_notify_broadcast_callback(callback):
    global _broadcast_callback
    _broadcast_callback = callback

class NotificationRequest(BaseModel):
    passenger_ref: str = Field(..., description="Passenger Phone, PNR, or Reference (e.g., '+91-98765-XXXXX' or 'PNR 284-9182741')")
    message: str = Field(..., description="Notification message content")
    channel: Literal["SMS", "WhatsApp"] = Field("SMS", description="Simulated dispatch channel")
    train_id: Optional[str] = None
    seat_berth: Optional[str] = None
    pnr: Optional[str] = None

class BatchDelayNotificationRequest(BaseModel):
    train_id: str
    train_name: str
    delay_minutes: int
    reason: str
    passengers_count: int = 150
    channel: Literal["SMS", "WhatsApp"] = "SMS"

def send_notification(
    passenger_ref: str,
    message: str,
    channel: str = "SMS",
    train_id: Optional[str] = None,
    seat_berth: Optional[str] = None,
    pnr: Optional[str] = None
) -> Dict[str, Any]:
    """
    Simulated passenger notification dispatcher.
    Logs to an in-app telemetry feed and emits to UI WebSockets without making external telco API calls.
    
    NOTE (Member D Disclosure): This function is strictly SIMULATED. It does not interface
    with external SMS gateways (e.g. Twilio, Gupshup, Fast2SMS) to ensure 100% offline demo safety.
    """
    channel_label = f"{channel.upper()} (Simulated)"
    record_id = f"notif_{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    record = {
        "id": record_id,
        "timestamp": timestamp,
        "passenger_ref": passenger_ref,
        "message": message,
        "channel": channel_label,
        "status": "SIMULATED_DELIVERED",
        "is_simulated": True,
        "train_id": train_id,
        "seat_berth": seat_berth,
        "pnr": pnr,
        "disclaimer": "[SIMULATED NOTIFICATION] Displayed in dashboard feed only; zero external telco dependency."
    }
    
    SIMULATED_NOTIFICATIONS_FEED.insert(0, record)
    # Keep last 200 records in buffer
    if len(SIMULATED_NOTIFICATIONS_FEED) > 200:
        SIMULATED_NOTIFICATIONS_FEED.pop()
        
    return record

@notify_router.post("/send")
async def handle_send_notification(req: NotificationRequest, background_tasks: BackgroundTasks):
    """
    Dispatch a single simulated passenger SMS or WhatsApp alert.
    """
    record = send_notification(
        passenger_ref=req.passenger_ref,
        message=req.message,
        channel=req.channel,
        train_id=req.train_id,
        seat_berth=req.seat_berth,
        pnr=req.pnr
    )
    
    # Broadcast to WebSocket if callback registered
    if _broadcast_callback:
        try:
            background_tasks.add_task(_broadcast_callback, {
                "type": "simulated_notification",
                "data": record
            })
        except Exception:
            pass
            
    return {
        "status": "success",
        "is_simulated": True,
        "record": record
    }

@notify_router.post("/broadcast-delay")
async def handle_broadcast_delay_alerts(req: BatchDelayNotificationRequest, background_tasks: BackgroundTasks):
    """
    Generate batch simulated passenger notifications for a train disruption event.
    """
    sample_pnrs = [
        ("PNR 284-9182741", "+91-98765-43210", "B3-24 (3A)"),
        ("PNR 492-1084723", "+91-91234-56789", "A1-12 (2A)"),
        ("PNR 619-3829104", "+91-94567-89012", "C2-45 (CC)"),
        ("PNR 831-5029481", "+91-99887-76655", "H1-04 (1A)"),
        ("PNR 740-1928374", "+91-97654-32109", "B5-18 (3A)")
    ]
    
    dispatched = []
    for pnr, phone, seat in sample_pnrs:
        msg = (
            f"IRCTC Alert: Train {req.train_id} ({req.train_name}) is delayed by {req.delay_minutes} min "
            f"due to {req.reason}. RailMind has updated your downstream schedule. "
            f"Track live: http://railmind.internal/pnr/{pnr.split()[-1]}"
        )
        rec = send_notification(
            passenger_ref=f"{phone} ({pnr})",
            message=msg,
            channel=req.channel,
            train_id=req.train_id,
            seat_berth=seat,
            pnr=pnr
        )
        dispatched.append(rec)
        
    return {
        "status": "success",
        "is_simulated": True,
        "passengers_alerted_count": len(dispatched),
        "total_simulated_reach": req.passengers_count,
        "sample_records": dispatched
    }

@notify_router.get("/feed")
async def get_notification_feed(limit: int = 50):
    """
    Retrieve the visible in-app 'Sent Notifications' simulated feed.
    """
    return {
        "channel_type": "SIMULATED_PASSENGER_FEED",
        "total_count": len(SIMULATED_NOTIFICATIONS_FEED),
        "notifications": SIMULATED_NOTIFICATIONS_FEED[:limit]
    }

@notify_router.post("/clear")
async def clear_notification_feed():
    """
    Clear in-app simulated notification feed.
    """
    global SIMULATED_NOTIFICATIONS_FEED
    SIMULATED_NOTIFICATIONS_FEED.clear()
    return {"status": "Simulated notifications feed cleared."}
