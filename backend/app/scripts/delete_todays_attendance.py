"""
Delete today's attendance log for Utkarsh Jha (GTPL-25002).
Run with: python -m app.scripts.delete_todays_attendance
"""
import asyncio
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.models.attendance import AttendanceLog


async def run():
    today = date.today()
    async with AsyncSessionLocal() as db:
        # Get Utkarsh
        result = await db.execute(
            select(Employee).where(Employee.emp_code == 'GTPL-25002')
        )
        emp = result.scalar_one_or_none()
        if not emp:
            print("ERROR: Employee GTPL-25002 not found")
            return

        # Find today's logs
        result = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.date == today,
            )
        )
        logs = result.scalars().all()

        if not logs:
            print(f"No attendance logs found for {emp.full_name} on {today}.")
            return

        print(f"Found {len(logs)} log(s) for {emp.full_name} on {today}:")
        for log in logs:
            print(f"  - punch_in={log.punch_in}  punch_out={log.punch_out}  status={log.status}")

        await db.execute(
            delete(AttendanceLog).where(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.date == today,
            )
        )
        await db.commit()
        print(f"Deleted {len(logs)} log(s). Attendance cleared for today.")


if __name__ == '__main__':
    asyncio.run(run())
