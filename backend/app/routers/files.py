"""
Authenticated file serving — payslips and other sensitive documents.

Payslips are NOT mounted as public static files. Every download is gated
by authentication and an ownership check:
  - HR / super_admin  → may download any employee's payslip
  - Everyone else     → may only download their own payslips

Path-traversal protection: filenames containing `/`, `\\`, or `..` are
rejected with HTTP 400 before any filesystem access.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.employee import Employee, UserRole
from app.models.payroll import Payslip

router = APIRouter(prefix="/files", tags=["Files"])

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PAYSLIP_DIR = os.path.join(_BACKEND_ROOT, "uploads", "payslips")


def _safe_filename(filename: str) -> str:
    """Reject any filename that attempts path traversal."""
    if any(c in filename for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filename


@router.get("/payslips/{filename}", summary="Download a payslip (authenticated)")
async def download_payslip(
    filename: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    _safe_filename(filename)

    # HR / admin may access any payslip
    if current_employee.role not in (UserRole.super_admin, UserRole.hr_admin):
        # Regular employees may only download their own payslips
        result = await db.execute(
            select(Payslip).where(
                Payslip.employee_id == current_employee.id,
                Payslip.pdf_url.contains(filename),
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")

    file_path = os.path.join(_PAYSLIP_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Payslip file not found")

    media_type = "text/html" if filename.endswith(".html") else "application/pdf"
    return FileResponse(path=file_path, filename=filename, media_type=media_type)
