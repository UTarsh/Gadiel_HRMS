"""
Org data seed: Assigns department, designation, date_of_joining, reporting_manager,
salary_level, and role to all 13 Gadiel employees.

HOW TO USE:
  1. Fill in the ORG_DATA dict below with data from Gadiel (or their HR).
  2. Run: python -m app.scripts.seed_org_data

WHAT IT SETS:
  - department_name    : Must match a name in the `departments` table
  - designation_name   : Will be created if it doesn't exist
  - date_of_joining    : ISO format "YYYY-MM-DD"
  - reporting_manager  : emp_code of the manager (e.g. "GTPL005")
  - salary_level       : 1-6 (L1 to L6)
  - role               : employee / manager / hr_admin / super_admin

EMPLOYEES (for reference):
  GTPL001 — Karthik Pandian
  GTPL002 — Tejveer Singh
  GTPL003 — Akanksha Bhat
  GTPL004 — Shruti Sharma
  GTPL005 — Monika              [hr_admin — confirmed]
  GTPL006 — Ashish Suri
  GTPL007 — Nikitasha Sharma
  GTPL008 — Pratima Maurya
  GTPL009 — Shambhavi Kholia
  GTPL010 — Vishal Mantoo
  GTPL011 — Sonali Verma
  GTPL012 — Sneha Sharma
  GTPL013 — Kumar Kandroo

DEPARTMENTS AVAILABLE (seeded):
  Engineering, Human Resources, Sales, Marketing, Finance, Operations, Management
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import date
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.employee import Employee, Department, Designation, UserRole
from app.models.salary import SalaryLevel


# ─────────────────────────────────────────────────────────────────────────────
# FILL THIS IN — get exact values from Gadiel's HR (Monika)
# ─────────────────────────────────────────────────────────────────────────────
ORG_DATA = {
    "GTPL001": {
        "department_name": "Engineering",          # TODO: confirm with Gadiel
        "designation_name": "Software Engineer",   # TODO: confirm with Gadiel
        "date_of_joining": None,                   # TODO: e.g. "2023-06-01"
        "reporting_manager": "GTPL013",            # TODO: confirm manager
        "salary_level": None,                      # TODO: 1-6
        "role": "employee",
    },
    "GTPL002": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL003": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL004": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL005": {
        "department_name": "Human Resources",      # confirmed — Monika is HR
        "designation_name": "HR Manager",
        "date_of_joining": None,                   # TODO: get from Gadiel
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "hr_admin",                        # confirmed
    },
    "GTPL006": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL007": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL008": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL009": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL010": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL011": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL012": {
        "department_name": "Engineering",
        "designation_name": "Software Engineer",
        "date_of_joining": None,
        "reporting_manager": "GTPL013",
        "salary_level": None,
        "role": "employee",
    },
    "GTPL013": {
        "department_name": "Management",           # Kumar Kandroo — likely Director/CTO
        "designation_name": "Director",            # TODO: confirm title
        "date_of_joining": None,
        "reporting_manager": None,                 # reports to no one (top of hierarchy)
        "salary_level": 6,                         # L6 — senior/management level
        "role": "manager",
    },
}


async def seed():
    async with AsyncSessionLocal() as db:
        print("[ORG] Seeding org data for all 13 Gadiel employees...")

        # Pre-load all employees and departments
        emp_map = {}
        result = await db.execute(select(Employee))
        for emp in result.scalars().all():
            emp_map[emp.emp_code] = emp

        dept_map = {}
        result = await db.execute(select(Department))
        for dept in result.scalars().all():
            dept_map[dept.name] = dept

        level_map = {}
        result = await db.execute(select(SalaryLevel))
        for sl in result.scalars().all():
            level_map[sl.level] = sl

        desig_map = {}
        result = await db.execute(select(Designation))
        for d in result.scalars().all():
            desig_map[d.name] = d

        missing_fields = []

        for emp_code, org in ORG_DATA.items():
            emp = emp_map.get(emp_code)
            if not emp:
                print(f"  [SKIP] {emp_code} not found in DB")
                continue

            todo = []

            # Department
            if org.get("department_name"):
                dept = dept_map.get(org["department_name"])
                if dept:
                    emp.department_id = dept.id
                else:
                    print(f"  [WARN] Dept '{org['department_name']}' not found for {emp_code}")
            else:
                todo.append("department")

            # Designation (auto-create if missing)
            if org.get("designation_name"):
                desig = desig_map.get(org["designation_name"])
                if not desig:
                    desig = Designation(name=org["designation_name"])
                    db.add(desig)
                    await db.flush()
                    desig_map[desig.name] = desig
                emp.designation_id = desig.id
            else:
                todo.append("designation")

            # Date of joining
            if org.get("date_of_joining"):
                emp.date_of_joining = date.fromisoformat(org["date_of_joining"])
            else:
                todo.append("date_of_joining")

            # Salary level
            if org.get("salary_level"):
                sl = level_map.get(org["salary_level"])
                if sl:
                    emp.salary_level_id = sl.id
                else:
                    print(f"  [WARN] Salary level {org['salary_level']} not found for {emp_code}")
            else:
                todo.append("salary_level")

            # Role
            if org.get("role"):
                emp.role = UserRole(org["role"])

            if todo:
                missing_fields.append((emp_code, emp.first_name, emp.last_name, todo))
                print(f"  [PARTIAL] {emp_code} {emp.first_name} {emp.last_name} — still needs: {', '.join(todo)}")
            else:
                print(f"  [OK] {emp_code} {emp.first_name} {emp.last_name} — all org fields set")

        # Second pass: set reporting managers (after all emps updated)
        for emp_code, org in ORG_DATA.items():
            mgr_code = org.get("reporting_manager")
            if mgr_code:
                emp = emp_map.get(emp_code)
                mgr = emp_map.get(mgr_code)
                if emp and mgr:
                    emp.reporting_manager_id = mgr.id

        await db.commit()

        print("\n[DONE] Org data seed complete!")
        if missing_fields:
            print("\n[ACTION NEEDED] The following employees have missing org fields:")
            print("  Edit ORG_DATA in this script and re-run once Gadiel provides the data.\n")
            for code, fn, ln, missing in missing_fields:
                print(f"    {code} {fn} {ln}: {', '.join(missing)}")


if __name__ == "__main__":
    asyncio.run(seed())
