import base64
import hashlib
import hmac
import json
import re
import time
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from src.core import database as db
from src.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9]{3,32}$")


def _hash_password(password: str) -> str:
    return hashlib.sha256((password + settings.jwt_secret).encode()).hexdigest()


def create_token(user_id: str, username: str) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(json.dumps({
        "user_id": user_id, "username": username,
        "exp": int(time.time()) + settings.jwt_expire_minutes * 60,
    }).encode()).rstrip(b"=").decode()
    sig = hmac.new(settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected = hmac.new(settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=="))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


class RegisterRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not _USERNAME_RE.match(v):
            raise ValueError("Username must be 3-32 alphanumeric characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(body: RegisterRequest) -> dict:
    existing = db.user_get(body.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    password_hash = _hash_password(body.password)
    user_id = db.user_create(body.username, password_hash)
    token = create_token(user_id, body.username)

    return {"user_id": user_id, "username": body.username, "token": token}


@router.post("/login")
async def login(body: LoginRequest) -> dict:
    user = db.user_get(body.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if user["password_hash"] != _hash_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(user["id"], user["username"])
    return {"user_id": user["id"], "username": user["username"], "token": token}


@router.get("/me")
async def me(request: Request) -> dict:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.user_get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"user_id": user["id"], "username": user["username"], "created_at": user["created_at"]}
