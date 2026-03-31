"""
Permanently delete Kumar Kandroo and all related records.
Uses raw SQL to avoid ORM FK issues.
Run: python -m app.scripts.delete_kumar
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import text
from app.database import AsyncSessionLocal


async def run():
    async with AsyncSessionLocal() as db:
        # Find Kumar
        r = await db.execute(text(
            "SELECT id, emp_code, first_name, last_name, is_active FROM employees "
            "WHERE first_name = 'Kumar' AND last_name = 'Kandroo'"
        ))
        row = r.fetchone()
        if not row:
            print("[GONE] Kumar Kandroo not found — already deleted or never existed")
            return

        eid = row[0]
        print(f"[FOUND] {row[1]} {row[2]} {row[3]}  (id={eid}, active={row[4]})")
        print()

        # Delete in order: child tables first
        tables_direct = [
            ("attendance_logs", "employee_id"),
            ("shift_assignments", "employee_id"),
            ("leave_balances", "employee_id"),
            ("leave_requests", "employee_id"),
            ("tasks", "assigned_to_id"),
            ("tasks", "assigned_by_id"),
            ("notifications", "employee_id"),
            ("salary_components", "employee_id"),
            ("salary_tracker_records", "employee_id"),
            ("salary_trackers", "employee_id"),
            ("payslips", "employee_id"),
            ("employee_profiles", "employee_id"),
            ("device_tokens", "employee_id"),
            ("documents", "employee_id"),
        ]

        for tbl, col in tables_direct:
            try:
                r = await db.execute(text(f"DELETE FROM {tbl} WHERE {col} = :eid"), {"eid": eid})
                if r.rowcount > 0:
                    print(f"  [{tbl}.{col}] deleted {r.rowcount} rows")
            except Exception as e:
                print(f"  [{tbl}.{col}] skip — {e}")

        # Nullify FK references in other employees / payroll runs / etc
        nullify = [
            ("employees", "reporting_manager_id"),
            ("attendance_logs", "corrected_by_id"),
            ("leave_requests", "approved_by_id"),
            ("payroll_runs", "processed_by_id"),
            ("payroll_runs", "approved_by_id"),
            ("documents", "uploaded_by_id"),
            ("documents", "verified_by_id"),
            ("audit_logs", "employee_id"),
        ]

        for tbl, col in nullify:
            try:
                r = await db.execute(
                    text(f"UPDATE {tbl} SET {col} = NULL WHERE {col} = :eid"),
                    {"eid": eid},
                )
                if r.rowcount > 0:
                    print(f"  [{tbl}.{col}] nullified {r.rowcount} refs")
            except Exception as e:
                print(f"  [{tbl}.{col}] skip — {e}")

        # Department head_id
        try:
            r = await db.execute(
                text("UPDATE departments SET head_id = NULL WHERE head_id = :eid"),
                {"eid": eid},
            )
            if r.rowcount > 0:
                print(f"  [departments.head_id] nullified {r.rowcount} refs")
        except Exception:
            pass

        # Finally delete the employee
        await db.execute(text("DELETE FROM employees WHERE id = :eid"), {"eid": eid})
        print(f"\n  [DELETED] Kumar Kandroo removed from employees table")

        await db.commit()
        print("\n[DONE] Kumar Kandroo permanently purged from database.")


if __name__ == "__main__":
    asyncio.run(run())
