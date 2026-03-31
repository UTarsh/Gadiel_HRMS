import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.employee import Employee, Designation

async def update_org():
    async with AsyncSessionLocal() as db:
        print("\n=== Special Org Chart Hierarchy Fix ===\n")
        
        # 1. Update Designations
        res = await db.execute(select(Designation).where(Designation.name == "Intern Developer (Data & AI)"))
        desig = res.scalar_one_or_none()
        if not desig:
            desig = Designation(name="Intern Developer (Data & AI)")
            db.add(desig)
            await db.flush()
            print("CREATED DESIGNATION: Intern Developer (Data & AI)")
        
        # 2. Maps
        result = await db.execute(select(Employee))
        emp_map = {e.emp_code: e for e in result.scalars().all()}
        
        updates = [
            ("GTPPT-26005", "Tushar",  "GTPL-25002"), # -> Utkarsh
            ("GTPPT-26006", "Sahil",   "GTPL-25010"), # -> Shruti
            ("GTPPT-26007", "Ridhi",   "GTPL-25011"), # -> Akanksha
        ]
        
        for code, name, mgr_code in updates:
            emp = emp_map.get(code)
            mgr = emp_map.get(mgr_code)
            if emp and mgr:
                emp.reporting_manager_id = mgr.id
                emp.designation_id = desig.id
                print(f"UPDATED: {name} ({code}) -> reports to {mgr_code}")
            else:
                if not emp: print(f"MISSING: Employee {code}")
                if not mgr: print(f"MISSING: Manager {mgr_code}")
        
        await db.commit()
        print("\n=== Done! Organization structure refined. ===\n")

if __name__ == "__main__":
    asyncio.run(update_org())
