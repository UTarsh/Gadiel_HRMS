"""
One-time script: Clear all employee password hashes.
This forces every employee to go through the mobile/web sign-up flow
(email verify → create password → retype → save) on their first login.

Run with:  python -m app.scripts.clear_passwords
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import update
from app.database import AsyncSessionLocal
from app.models.employee import Employee


async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            update(Employee).values(password_hash=None)
        )
        await db.commit()
        print(f"Done. Cleared passwords for {result.rowcount} employees.")
        print("Every employee must now set their own password on first sign-in.")


if __name__ == "__main__":
    asyncio.run(run())
