"""
Patch org chart reporting relationships — April 2026

Changes:
  1. Tushar Anupam Kumar (GTPPT-26005) -> reports to Shruti Sharma (GTPL-25010)
  2. Sahil Raturi (GTPPT-26006)        -> reports to Akanksha Bhat (GTPL-25011)
  3. Ridhi (GTPPT-26007)               -> deactivate (remove from org)
  4. Test User (GTPL-TEST-01)          -> deactivate (hide from org)

Run with:  python -m app.scripts.patch_org_chart
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
        print("\n=== Patching org chart ===\n")

        # Load all relevant employees by emp_code
        codes = ["GTPPT-26005", "GTPPT-26006", "GTPPT-26007", "GTPL-TEST-01",
                 "GTPL-25010", "GTPL-25011"]
        result = await db.execute(select(Employee).where(Employee.emp_code.in_(codes)))
        by_code = {e.emp_code: e for e in result.scalars().all()}

        def get(code):
            emp = by_code.get(code)
            if not emp:
                print(f"  WARN: employee {code} not found — skipping")
            return emp

        shruti   = get("GTPL-25010")
        akanksha = get("GTPL-25011")
        tushar   = get("GTPPT-26005")
        sahil    = get("GTPPT-26006")
        ridhi    = get("GTPPT-26007")
        testuser = get("GTPL-TEST-01")

        # 1. Tushar -> Shruti
        if tushar and shruti:
            old = tushar.reporting_manager_id
            tushar.reporting_manager_id = shruti.id
            print(f"  [1] Tushar reporting_manager_id: {old} -> {shruti.id} (Shruti)")

        # 2. Sahil -> Akanksha
        if sahil and akanksha:
            old = sahil.reporting_manager_id
            sahil.reporting_manager_id = akanksha.id
            print(f"  [2] Sahil reporting_manager_id: {old} -> {akanksha.id} (Akanksha)")

        # 3. Deactivate Ridhi
        if ridhi:
            ridhi.is_active = False
            print(f"  [3] Ridhi ({ridhi.id}) deactivated")

        # 4. Deactivate Test User
        if testuser:
            testuser.is_active = False
            print(f"  [4] Test User ({testuser.id}) deactivated")

        await db.commit()
        print("\nDone. Verifying active employee count...")

        result = await db.execute(select(Employee).where(Employee.is_active == True))
        active = result.scalars().all()
        print(f"  Active employees: {len(active)}")
        if len(active) != 16:
            print(f"  WARN: expected 16 active employees, got {len(active)}")
            print("  Active list:")
            for e in sorted(active, key=lambda x: x.emp_code or ""):
                print(f"    {e.emp_code:15s}  {e.first_name} {e.last_name or ''}")
        else:
            print("  Count is correct (16). Org chart patch complete.")


if __name__ == "__main__":
    asyncio.run(run())
