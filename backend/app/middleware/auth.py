"""
Auth middleware — supports two token delivery mechanisms:

  1. httpOnly cookie  `access_token`  (web browser — preferred)
  2. Authorization: Bearer <token>     (mobile apps / API clients)

Cookie takes priority. If neither is present the request is rejected 401.

Every token is also checked against the Redis blacklist (populated on logout
or employee deactivation). Redis failures are fail-open with a warning log.
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.utils.redis_client import is_token_blacklisted
from app.utils.security import decode_token


def _extract_token(request: Request) -> str | None:
    """Pull the raw JWT string from cookie (web) or Authorization header (mobile)."""
    # Priority 1: httpOnly cookie set by the backend (web)
    token = request.cookies.get("access_token")
    if token:
        return token

    # Priority 2: Bearer token in Authorization header (mobile / API)
    authorization = request.headers.get("Authorization", "")
    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() == "bearer" and token:
        return token

    return None


async def get_current_employee(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Employee:
    token = _extract_token(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Blacklist check — catches tokens revoked at logout / deactivation
    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
        )

    employee_id = payload.get("sub")
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Employee not found or deactivated",
        )

    return employee


def require_roles(*roles: UserRole):
    """Dependency factory — restrict endpoint to the given roles."""
    async def _check(current_employee: Employee = Depends(get_current_employee)) -> Employee:
        if current_employee.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_employee
    return _check


# Convenience shorthands
require_hr      = require_roles(UserRole.super_admin, UserRole.hr_admin)
require_manager = require_roles(UserRole.super_admin, UserRole.hr_admin, UserRole.manager)
require_admin   = require_roles(UserRole.super_admin)
