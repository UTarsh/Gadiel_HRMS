"""
Audit log helper — write immutable HR compliance events.

Usage:
    await write_audit_log(
        db=db,
        action=AuditAction.approved,
        entity_type="leave_request",
        entity_id=leave.id,
        performed_by_id=current_employee.id,
        description="Leave approved by manager",
        request=request,
    )

The calling endpoint is responsible for committing the session.
"""
import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog


async def write_audit_log(
    db: AsyncSession,
    action: AuditAction,
    entity_type: str,
    entity_id: Optional[str] = None,
    performed_by_id: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    description: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    if request:
        # Respect X-Forwarded-For when behind a reverse proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        elif request.client:
            ip_address = request.client.host
        user_agent = request.headers.get("User-Agent")

    db.add(
        AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by_id=performed_by_id,
            ip_address=ip_address,
            user_agent=user_agent,
            old_values=json.dumps(old_values, default=str) if old_values else None,
            new_values=json.dumps(new_values, default=str) if new_values else None,
            description=description,
        )
    )
