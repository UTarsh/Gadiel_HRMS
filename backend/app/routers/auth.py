from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.audit_log import AuditAction
from app.models.employee import DeviceToken, Employee
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterDeviceTokenRequest,
    SetupPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.common import ok
from app.utils.audit import write_audit_log
from app.utils.limiter import limiter
from app.utils.redis_client import blacklist_token
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

_IS_PROD = settings.APP_ENV == "production"

# ─── Cookie helpers ───────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Write httpOnly auth cookies (web clients). Mobile clients use the JSON body tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_IS_PROD,          # HTTPS-only in production
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_IS_PROD,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh",  # scope the refresh cookie to this endpoint only
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", summary="Login — returns JWT access + refresh tokens")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.email == body.email, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee or not employee.password_hash or not verify_password(body.password, employee.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    await db.execute(
        update(Employee)
        .where(Employee.id == employee.id)
        .values(last_login_at=datetime.now(timezone.utc))
    )

    access_token = create_access_token(employee.id, employee.email, employee.role.value)
    refresh_token = create_refresh_token(employee.id)

    # Set httpOnly cookies for web browsers
    _set_auth_cookies(response, access_token, refresh_token)

    # Audit trail
    await write_audit_log(
        db=db,
        action=AuditAction.login,
        entity_type="employee",
        entity_id=employee.id,
        performed_by_id=employee.id,
        description=f"Login from {request.client.host if request.client else 'unknown'}",
        request=request,
    )

    # Also return tokens in body — mobile clients need them (can't read httpOnly cookies)
    return ok(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Login successful",
    )


@router.post("/refresh", summary="Exchange refresh token for new access + refresh tokens")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Web: refresh token arrives via httpOnly cookie
    # Mobile: refresh token arrives in the request body
    token_str: Optional[str] = request.cookies.get("refresh_token")

    if not token_str:
        try:
            body_data = await request.json()
            token_str = body_data.get("refresh_token")
        except Exception:
            pass

    if not token_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    payload = decode_token(token_str)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Blacklist check — reject replayed refresh tokens
    jti = payload.get("jti")
    from app.utils.redis_client import is_token_blacklisted
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    employee_id = payload.get("sub")
    result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.is_active == True))
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Employee not found")

    new_access = create_access_token(employee.id, employee.email, employee.role.value)
    new_refresh = create_refresh_token(employee.id)

    # Rotate: blacklist the used refresh token
    if jti:
        exp = payload.get("exp", 0)
        ttl = exp - int(datetime.now(timezone.utc).timestamp())
        await blacklist_token(jti, max(ttl, 0))

    _set_auth_cookies(response, new_access, new_refresh)

    return ok(
        data=TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Token refreshed",
    )


@router.post("/logout", summary="Logout — revoke tokens and clear cookies")
async def logout(
    request: Request,
    response: Response,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    # Revoke access token
    from app.middleware.auth import _extract_token
    token = _extract_token(request)
    if token:
        payload = decode_token(token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp", 0)
            if jti:
                ttl = exp - int(datetime.now(timezone.utc).timestamp())
                await blacklist_token(jti, max(ttl, 0))

    # Revoke refresh token if present in cookie
    rt = request.cookies.get("refresh_token")
    if rt:
        r_payload = decode_token(rt)
        if r_payload:
            jti = r_payload.get("jti")
            exp = r_payload.get("exp", 0)
            if jti:
                ttl = exp - int(datetime.now(timezone.utc).timestamp())
                await blacklist_token(jti, max(ttl, 0))

    _clear_auth_cookies(response)

    await write_audit_log(
        db=db,
        action=AuditAction.logout,
        entity_type="employee",
        entity_id=current_employee.id,
        performed_by_id=current_employee.id,
        request=request,
    )

    return ok(message="Logged out successfully")


@router.post("/change-password", summary="Change own password")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not current_employee.password_hash or not verify_password(body.current_password, current_employee.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    await db.execute(
        update(Employee)
        .where(Employee.id == current_employee.id)
        .values(password_hash=hash_password(body.new_password))
    )

    await write_audit_log(
        db=db,
        action=AuditAction.password_changed,
        entity_type="employee",
        entity_id=current_employee.id,
        performed_by_id=current_employee.id,
        request=request,
    )

    return ok(message="Password changed successfully")


@router.post("/register-device-token", summary="Register FCM token for push notifications (mobile)")
async def register_device_token(
    body: RegisterDeviceTokenRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(DeviceToken)
        .where(
            DeviceToken.employee_id == current_employee.id,
            DeviceToken.platform == body.platform,
        )
        .values(is_active=False)
    )
    db.add(DeviceToken(
        employee_id=current_employee.id,
        token=body.token,
        platform=body.platform,
        is_active=True,
    ))
    return ok(message="Device token registered")


@router.get("/me", summary="Get current logged-in employee profile")
async def me(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    from app.schemas.employee import EmployeeDetailOut
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.id == current_employee.id)
    )
    employee = result.scalar_one()
    return ok(data=EmployeeDetailOut.model_validate(employee))


@router.post("/verify-email", summary="Check if work email exists (step 1 of mobile sign-up)")
@limiter.limit("5/minute")
async def verify_email(request: Request, body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):  # noqa: ARG001 — request required by slowapi rate limiter
    result = await db.execute(
        select(Employee).where(Employee.email == body.email, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found. Please use your Gadiel Technologies work email.",
        )

    return ok(data={
        "first_name": employee.first_name,
        "has_password": employee.password_hash is not None,
    })


@router.post("/setup-password", summary="Set password for first-time account activation")
@limiter.limit("5/minute")
async def setup_password(
    request: Request,
    response: Response,
    body: SetupPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.email == body.email, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    if employee.password_hash is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password already set. Please use the login screen.",
        )

    if body.password != body.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    if len(body.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    await db.execute(
        update(Employee)
        .where(Employee.id == employee.id)
        .values(password_hash=hash_password(body.password))
    )

    access_token = create_access_token(employee.id, employee.email, employee.role.value)
    refresh_token_str = create_refresh_token(employee.id)

    _set_auth_cookies(response, access_token, refresh_token_str)

    await write_audit_log(
        db=db,
        action=AuditAction.created,
        entity_type="employee",
        entity_id=employee.id,
        performed_by_id=employee.id,
        description="Account password activated",
        request=request,
    )

    return ok(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Account activated successfully",
    )
