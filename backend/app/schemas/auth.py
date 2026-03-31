from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.employee import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str           # employee id
    email: str
    role: UserRole
    exp: Optional[int] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class RegisterDeviceTokenRequest(BaseModel):
    """Called by mobile app after login to register FCM push token."""
    token: str
    platform: str  # android / ios / web


class VerifyEmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailResponse(BaseModel):
    first_name: str
    has_password: bool


class SetupPasswordRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
