"""
routers/auth.py — Authentication endpoints.

WHY: Users need to log in to get a JWT token. After login, they include the token
in every request. This prevents unauthorized access to your private documents.

In production you'd connect to a real database of users. Here we use a simple 
in-memory demo user list from config.py.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import authenticate_user, create_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    message: str


@router.post("/login", response_model=LoginResponse, summary="Get a JWT access token")
async def login(request: LoginRequest):
    """
    Exchange username + password for a JWT token.
    
    Demo credentials:
    - username: admin, password: admin123
    - username: demo, password: demo123
    
    The returned token must be sent with every subsequent request as:
    `Authorization: Bearer <token>`
    """
    if not authenticate_user(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. Demo credentials: admin/admin123",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_token(request.username)
    return LoginResponse(
        access_token=token,
        username=request.username,
        message=f"Welcome, {request.username}! Your session is valid for 24 hours.",
    )
