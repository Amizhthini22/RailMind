import time
import hmac
import hashlib
import secrets
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends, status
from pydantic import BaseModel, Field

auth_router = APIRouter(prefix="/api", tags=["Auth"])

# Secret key for session token signing (local demo default)
SECRET_KEY = "railmind-auth-token-secret-key-production"

# Active in-memory session registry: token -> session metadata
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Demo user credentials & assigned role mappings
VALID_USERS = {
    "controller": {
        "password": "controller123",
        "name": "Chief Operations Controller (NDLS Control)",
        "role": "controller",
        "permissions": ["reschedule", "escalate", "substitute", "voice_command", "view"]
    },
    "station_master": {
        "password": "sm123",
        "name": "Station Master (Kanpur Central)",
        "role": "station_master",
        "permissions": ["substitute", "voice_command", "view"]
    },
    "viewer": {
        "password": "viewer123",
        "name": "Operations Auditor",
        "role": "viewer",
        "permissions": ["view"]
    }
}

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    name: str
    permissions: List[str]

class SessionInfo(BaseModel):
    valid: bool
    username: str
    role: str
    name: str
    permissions: List[str]
    created_at: float
    expires_at: float

def generate_token(username: str, role: str, expires_in_sec: int = 86400) -> str:
    """Generate a secure cryptographic session token."""
    random_part = secrets.token_hex(16)
    timestamp = str(int(time.time()))
    payload = f"{username}:{role}:{timestamp}:{random_part}"
    signature = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify session token integrity and expiration."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload, signature = parts[0], parts[1]
        expected_sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Check active session cache
        if token in ACTIVE_SESSIONS:
            session = ACTIVE_SESSIONS[token]
            if time.time() > session.get("expires_at", 0):
                del ACTIVE_SESSIONS[token]
                return None
            return session
            
        # Parse payload if not in cache
        payload_parts = payload.split(":")
        if len(payload_parts) >= 3:
            username = payload_parts[0]
            role = payload_parts[1]
            created_at = float(payload_parts[2])
            user_data = VALID_USERS.get(username, {})
            return {
                "username": username,
                "role": role,
                "name": user_data.get("name", username),
                "permissions": user_data.get("permissions", []),
                "created_at": created_at,
                "expires_at": created_at + 86400
            }
    except Exception:
        return None
    return None

# Dependency for role-gating (Agreed signature with Member A)
def require_role(required_role: str):
    """
    Role-gating dependency. Member A applies this to their routes.
    """
    def role_checker(authorization: Optional[str] = Header(None)):
        if not authorization:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization Header")
        
        token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
        session = verify_token(token)
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
            
        user_role = session.get("role")
        if user_role != required_role and user_role != "controller": # controller has super-admin privilege
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{required_role}' required")
        return session
    return role_checker

@auth_router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    Authenticate user credentials and issue cryptographic session token.
    (Owned by Member D)
    """
    user = VALID_USERS.get(req.username.lower())
    if not user or user["password"] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    expires_in = 86400 # 24 hours
    token = generate_token(req.username.lower(), user["role"], expires_in)
    
    session_data = {
        "username": req.username.lower(),
        "role": user["role"],
        "name": user["name"],
        "permissions": user["permissions"],
        "created_at": time.time(),
        "expires_at": time.time() + expires_in
    }
    ACTIVE_SESSIONS[token] = session_data

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        role=user["role"],
        name=user["name"],
        permissions=user["permissions"]
    )

@auth_router.get("/session", response_model=SessionInfo)
async def get_session(authorization: Optional[str] = Header(None)):
    """Validate current session token and return user identity."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    session = verify_token(token)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    
    return SessionInfo(
        valid=True,
        username=session["username"],
        role=session["role"],
        name=session["name"],
        permissions=session.get("permissions", []),
        created_at=session.get("created_at", time.time()),
        expires_at=session.get("expires_at", time.time() + 86400)
    )

@auth_router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidate active session."""
    if authorization:
        token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
        if token in ACTIVE_SESSIONS:
            del ACTIVE_SESSIONS[token]
    return {"status": "Logged out successfully"}
