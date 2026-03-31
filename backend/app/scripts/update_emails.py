"""
Migration script: Update employee work emails to new format.
  OLD: firstname.lastname@gadieltech.com
  NEW: firstnameLAST_INITIAL@gadieltechnologies.com
       (e.g., karthik pandian -> karthikp@gadieltechnologies.com)

Run with:  python -m app.scripts.update_emails
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.employee import Employee


async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Employee).order_by(Employee.emp_code))
        employees = result.scalars().all()

        print(f"Found {len(employees)} employees. Updating emails...\n")
        updated = 0

        for emp in employees:
            last_initial = emp.last_name[0].lower() if emp.last_name else ""
            new_email = f"{emp.first_name.lower()}{last_initial}@gadieltechnologies.com"

            if emp.email != new_email:
                print(f"  {emp.emp_code}  {emp.email}  ->  {new_email}")
                await db.execute(
                    update(Employee)
                    .where(Employee.id == emp.id)
                    .values(email=new_email)
                )
                updated += 1
            else:
                print(f"  {emp.emp_code}  {emp.email}  (no change)")

        await db.commit()
        print(f"\nDone. Updated {updated} emails.")


if __name__ == "__main__":
    asyncio.run(run())
