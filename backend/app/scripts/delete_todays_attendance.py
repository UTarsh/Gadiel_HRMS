"""
Delete today's attendance log for one or ALL employees.

Usage:
  python -m app.scripts.delete_todays_attendance           # clears ALL employees today
  python -m app.scripts.delete_todays_attendance GTPL-25002 # clears one employee
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
    emp_code_filter = sys.argv[1] if len(sys.argv) > 1 else None

    async with AsyncSessionLocal() as db:
        if emp_code_filter:
            # Single employee
            result = await db.execute(
                select(Employee).where(Employee.emp_code == emp_code_filter)
            )
            emp = result.scalar_one_or_none()
            if not emp:
                print(f"ERROR: Employee {emp_code_filter!r} not found")
                return
            employees = [emp]
        else:
            # All active employees
            result = await db.execute(
                select(Employee).where(Employee.is_active == True).order_by(Employee.first_name)
            )
            employees = result.scalars().all()

        total_deleted = 0
        for emp in employees:
            logs_result = await db.execute(
                select(AttendanceLog).where(
                    AttendanceLog.employee_id == emp.id,
                    AttendanceLog.date == today,
                )
            )
            logs = logs_result.scalars().all()
            if logs:
                for log in logs:
                    print(f"  [{emp.emp_code}] {emp.full_name}: punch_in={log.punch_in}  status={log.status}  late={log.late_minutes}m  --> DELETING")
                await db.execute(
                    delete(AttendanceLog).where(
                        AttendanceLog.employee_id == emp.id,
                        AttendanceLog.date == today,
                    )
                )
                total_deleted += len(logs)

        if total_deleted == 0:
            print(f"No attendance logs found for {today}.")
        else:
            await db.commit()
            print(f"\nDeleted {total_deleted} log(s) for {today}. All cleared.")


if __name__ == '__main__':
    asyncio.run(run())
