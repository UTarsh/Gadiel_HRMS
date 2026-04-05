import os
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.employee_profile import EmployeeProfile
from app.schemas.employee_profile import ProfileUpdate, ProfileOut
from app.schemas.common import ok
from app.middleware.auth import get_current_employee

router = APIRouter(prefix="/profile", tags=["Profile"])

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(_BACKEND_ROOT, "uploads", "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024


def _allowed_extension(file: UploadFile) -> str:
    name = file.filename or ""
    ext = os.path.splitext(name)[1].lower()
    if ext == ".jpeg":
        ext = ".jpg"
    if ext in {".jpg", ".png", ".webp", ".gif"}:
        return ext

    content_type_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return content_type_map.get(file.content_type or "", ".jpg")


def _remove_existing_uploads(directory: str, employee_id: str) -> None:
    for ext in (".jpg", ".png", ".webp", ".gif"):
        path = os.path.join(directory, f"{employee_id}{ext}")
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


async def _save_raw_upload(directory: str, employee_id: str, file: UploadFile) -> str:
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 5 MB")

    ext = _allowed_extension(file)
    _remove_existing_uploads(directory, employee_id)

    filename = f"{employee_id}{ext}"
    file_path = os.path.join(directory, filename)
    with open(file_path, "wb") as f:
        f.write(raw)
    return f"{file_path}"


async def _get_or_create_profile(employee_id: str, db: AsyncSession) -> EmployeeProfile:
    result = await db.execute(
        select(EmployeeProfile).where(EmployeeProfile.employee_id == employee_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = EmployeeProfile(employee_id=employee_id)
        db.add(profile)
        await db.flush()
    return profile


def _build_response(employee: Employee) -> dict:
    p = employee.profile
    dept = employee.department
    desg = employee.designation
    return {
        "id": employee.id,
        "emp_code": employee.emp_code,
        "full_name": employee.full_name,
        "email": employee.email,
        "date_of_joining": employee.date_of_joining.isoformat() if employee.date_of_joining else None,
        "role": employee.role.value if employee.role else None,
        "employment_type": employee.employment_type.value if employee.employment_type else None,
        "employment_status": employee.employment_status.value if employee.employment_status else None,
        "work_location": employee.work_location,
        "department": {"id": dept.id, "name": dept.name} if dept else None,
        "designation": {"id": desg.id, "name": desg.name} if desg else None,
        "profile": {
            "avatar_url": p.avatar_url,
            "ghibli_image_url": p.ghibli_image_url,
            "custom_title": p.custom_title,
            "bio": p.bio,
            "birthday": p.birthday.isoformat() if p.birthday else None,
            "birthplace": p.birthplace,
            "guardian_name": p.guardian_name,
            "phone": p.phone,
            "blood_group": p.blood_group,
            "gender": p.gender,
            "marital_status": p.marital_status,
            "education": p.education,
            "skills": p.skills,
            "interests": p.interests,
            "certifications": p.certifications,
            "badges": p.badges,
            "assets": p.assets,
            "linkedin_url": p.linkedin_url,
            "github_url": p.github_url,
            "coding_profile_url": p.coding_profile_url,
        } if p else None,
    }


@router.get("/me", summary="Get my extended profile")
async def get_my_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.profile),
        )
        .where(Employee.id == current_employee.id)
    )
    employee = result.scalar_one()
    return ok(data=_build_response(employee))


@router.get("/{employee_id}", summary="Get extended profile of any employee (HR/admin/manager or self)")
async def get_employee_profile(
    employee_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    allowed_roles = (UserRole.hr_admin, UserRole.super_admin, UserRole.manager)
    if current_employee.role not in allowed_roles and current_employee.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.profile),
        )
        .where(Employee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return ok(data=_build_response(employee))


@router.patch("/me", summary="Update my extended profile")
async def update_my_profile(
    body: ProfileUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_or_create_profile(current_employee.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return ok(data=ProfileOut.model_validate(profile), message="Profile updated")


@router.post("/me/avatar", summary="Upload avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images are allowed")

    file_path = await _save_raw_upload(UPLOAD_DIR, current_employee.id, file)
    avatar_url = f"/uploads/avatars/{os.path.basename(file_path)}"

    profile = await _get_or_create_profile(current_employee.id, db)
    profile.avatar_url = avatar_url

    emp_row = await db.get(Employee, current_employee.id)
    if emp_row:
        emp_row.profile_picture_url = avatar_url

    await db.commit()
    return ok(data={"avatar_url": avatar_url}, message="Avatar uploaded successfully!")


GHIBLI_DIR = os.path.join(_BACKEND_ROOT, "uploads", "ghibli")
os.makedirs(GHIBLI_DIR, exist_ok=True)


@router.post("/me/ghibli", summary="Upload personal dashboard image")
async def upload_ghibli_image(
    file: UploadFile = File(...),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images are allowed")

    file_path = await _save_raw_upload(GHIBLI_DIR, current_employee.id, file)
    ghibli_image_url = f"/uploads/ghibli/{os.path.basename(file_path)}"

    profile = await _get_or_create_profile(current_employee.id, db)
    profile.ghibli_image_url = ghibli_image_url

    await db.commit()
    return ok(data={"ghibli_image_url": ghibli_image_url}, message="Dashboard image saved!")
