"""
Quick migration: Promote Utkarsh (GTPL-25002) and Vishal (GTPL-001) to super_admin.
Run: python -m app.scripts.promote_admins
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.employee import Employee, UserRole

PROMOTIONS = {
    "GTPL-25002": UserRole.super_admin,   # Utkarsh Jha
    "GTPL-001":   UserRole.super_admin,   # Vishal Mantoo
}

async def run():
    async with AsyncSessionLocal() as db:
        for emp_code, new_role in PROMOTIONS.items():
            result = await db.execute(
                select(Employee).where(Employee.emp_code == emp_code)
            )
            emp = result.scalar_one_or_none()
            if not emp:
                print(f"[SKIP] {emp_code} not found")
                continue
            old_role = emp.role.value
            emp.role = new_role
            print(f"[OK] {emp_code} {emp.first_name} {emp.last_name}: {old_role} -> {new_role.value}")
        await db.commit()
        print("\nDone! Roles updated.")

if __name__ == "__main__":
    asyncio.run(run())
