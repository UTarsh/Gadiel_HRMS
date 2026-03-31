"""
Reset ALL employee passwords to a single common password.
Run: python -m app.scripts.reset_all_passwords
"""
import asyncio, sys, os, logging
logging.disable(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.utils.security import hash_password

COMMON_PASSWORD = "Gadiel@2025"


async def run():
    hashed = hash_password(COMMON_PASSWORD)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Employee.id, Employee.emp_code, Employee.first_name, Employee.last_name, Employee.email))
        rows = result.all()

        print(f"Resetting passwords for {len(rows)} employees to: {COMMON_PASSWORD}")
        print("-" * 60)

        for emp_id, code, first, last, email in rows:
            await db.execute(
                update(Employee).where(Employee.id == emp_id).values(password_hash=hashed)
            )
            print(f"  ✓ {code:16s} {first} {last or ''} ({email})")

        await db.commit()
        print("-" * 60)
        print(f"[DONE] All {len(rows)} passwords reset to: {COMMON_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(run())
