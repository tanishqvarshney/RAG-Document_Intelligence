"""
auth.py — JWT Authentication utilities.

WHY: We don't want random people using our API. JWT (JSON Web Token) works like
a "wristband" you get at an event — you show it once (login), then flash it at
every door (API endpoint) and you're let in without re-entering your password.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, DEMO_USERS

# This tells FastAPI to look for a "Bearer <token>" header
security = HTTPBearer()


def create_token(username: str) -> str:
    """
    Create a JWT token for a user.
    Like stamping someone's wristband that expires in JWT_EXPIRY_HOURS.
    """
    payload = {
        "sub": username,                                                      # subject (who is this for)
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),  # expiry time
        "iat": datetime.now(timezone.utc),                                    # issued at
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """
    Verify a JWT token and return its contents.
    Like checking if the wristband is real and not expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    FastAPI dependency — extracts and verifies the token from the request header.
    Add this to any route to make it protected.
    
    Usage: `current_user = Depends(get_current_user)`
    """
    payload = verify_token(credentials.credentials)
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user information",
        )
    return username


def authenticate_user(username: str, password: str) -> bool:
    """Check if username/password match our demo user store."""
    return DEMO_USERS.get(username) == password
