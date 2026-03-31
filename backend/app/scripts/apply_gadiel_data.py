"""
Apply Gadiel Technologies official data from Requirements_asked_from_Gadiel.xlsx

This script (idempotent — safe to re-run):
  1. Adds new departments: IT & Consultancy, HR and Sustainability solutions
  2. Updates all 15 existing employees with official emp_codes, dept, designation,
     DOJ, probation_end_date, role, employment_type
  3. Fixes Monika's profile and email
  4. Deactivates Kumar Kandroo (not in official Gadiel list)
  5. Adds 3 new employees: Sahil Raturi, Tushar Anupam Kumar, Ridhi
  6. Seeds salary components for all 17 active employees (Gadiel formula from xlsx)
  7. Initializes leave balances + shift assignments for 3 new employees

Run with:  python -m app.scripts.apply_gadiel_data
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.employee import (
    Employee, Department, Designation,
    UserRole, EmploymentType, EmploymentStatus, Gender, MaritalStatus
)
from app.models.salary import SalaryLevel, SalaryComponent
from app.models.leave import LeaveType, LeaveBalance
from app.models.attendance import Shift, ShiftAssignment, GeofenceZone


# ─────────────────────────────────────────────────────────────────────────────
# New departments from Gadiel
# ─────────────────────────────────────────────────────────────────────────────
NEW_DEPARTMENTS = [
    {"name": "IT & Consultancy",              "code": "ITC"},
    {"name": "HR and Sustainability solutions","code": "HRSS"},
]


# ─────────────────────────────────────────────────────────────────────────────
# Employee update data (keyed by old DB emp_code)
# Source: Requirements_asked_from_Gadiel.xlsx
# ─────────────────────────────────────────────────────────────────────────────
UPDATES = {
    "GTPL001": {  # Karthik Pandian
        "new_emp_code":    "GTPLT-25005",
        "last_name_fix":   None,          # no change
        "email_fix":       None,          # already karthikp@
        "department":      "Sales",
        "designation":     "Lead Sales",
        "doj":             date(2025, 4, 3),
        "role":            "manager",
        "employment_type": "full_time",
        "salary_level":    6,
        "annual_ctc":      1300000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-001",   # Vishal
    },
    "GTPL002": {  # Tejveer Singh
        "new_emp_code":    "GTPLT-25013",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Intern Python Developer",
        "doj":             date(2025, 9, 24),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25002",  # Utkarsh
    },
    "GTPL003": {  # Akanksha Bhat
        "new_emp_code":    "GTPL-25011",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Python Developer",
        "doj":             date(2025, 8, 4),
        "role":            "manager",
        "employment_type": "full_time",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPLT-25005",  # Karthik
    },
    "GTPL004": {  # Shruti Sharma
        "new_emp_code":    "GTPL-25010",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Data & AI Engineer",
        "doj":             date(2025, 8, 4),
        "role":            "manager",
        "employment_type": "full_time",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPLT-25005",  # Karthik
    },
    "GTPL005": {  # Monika
        "new_emp_code":    "GTPL-25014",
        "last_name_fix":   "",
        "email_fix":       "monikab@gadieltechnologies.com",
        "department":      "IT & Consultancy",
        "designation":     "Frontend Developer",
        "doj":             date(2025, 12, 1),
        "role":            "employee",     # NOT hr_admin!
        "employment_type": "full_time",
        "salary_level":    2,
        "annual_ctc":      300000,
        "skip_loc":        True,           # was geofence-exempt
        "manager_new_code": "GTPL-001",    # Vishal
    },
    "GTPL006": {  # Ashish Suri
        "new_emp_code":    "GTPPT-26003",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Intern Frontend Developer",
        "doj":             date(2026, 1, 5),
        "role":            "manager",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPLT-25005",  # Karthik
    },
    "GTPL007": {  # Nikitasha Sharma
        "new_emp_code":    "GTPPT-26002",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Intern Python Developer",
        "doj":             date(2026, 1, 5),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPLT-25005",  # Karthik
    },
    "GTPL008": {  # Pratima Maurya
        "new_emp_code":    "GTPL-25007",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Python Developer (API)",
        "doj":             date(2025, 4, 15),
        "role":            "employee",
        "employment_type": "full_time",
        "salary_level":    2,
        "annual_ctc":      300000,
        "skip_loc":        True,            # was geofence-exempt
        "manager_new_code": "GTPL-25011",   # Akanksha
    },
    "GTPL009": {  # Shambhavi Kholia
        "new_emp_code":    "GTPPT-26004",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Intern Python/AI Developer",
        "doj":             date(2026, 2, 23),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      180000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25010",   # Shruti
    },
    "GTPL010": {  # Vishal Mantoo — Director/CEO
        "new_emp_code":    "GTPL-001",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "Management",
        "designation":     "Director",
        "doj":             date(2015, 1, 1),
        "role":            "super_admin",
        "employment_type": "full_time",
        "salary_level":    2,
        "annual_ctc":      360000,
        "skip_loc":        True,            # was geofence-exempt
        "manager_new_code": None,           # CEO — no manager
    },
    "GTPL011": {  # Sonali Verma
        "new_emp_code":    "GTPL-25009",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Backend Developer (AI)",
        "doj":             date(2025, 8, 1),
        "role":            "employee",
        "employment_type": "full_time",
        "salary_level":    3,
        "annual_ctc":      384000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25011",   # Akanksha
    },
    "GTPL012": {  # Sneha Sharma
        "new_emp_code":    "GTPPT-26001",
        "last_name_fix":   None,
        "email_fix":       None,
        "department":      "IT & Consultancy",
        "designation":     "Intern Python Developer",
        "doj":             date(2026, 1, 5),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        True,            # was geofence-exempt
        "manager_new_code": "GTPPT-26003",  # Ashish
    },
    # GTPL013 = Kumar Kandroo → DEACTIVATE (handled separately)
}


# ─────────────────────────────────────────────────────────────────────────────
# New employees to add (not yet in DB)
NEW_EMPLOYEES = [
    {
        "emp_code":        "GTPL-25002",
        "first_name":      "Utkarsh",
        "last_name":       "Jha",
        "email":           "utkarshj@gadieltechnologies.com",
        "gender":          "male",
        "department":      "IT & Consultancy",
        "designation":     "Lead Data & AI Engineer",
        "doj":             date(2025, 1, 6),
        "role":            "super_admin",
        "employment_type": "full_time",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPLT-25005",
    },
    {
        "emp_code":        "GTPL-25003",
        "first_name":      "Namrata",
        "last_name":       "Dudha",
        "email":           "namratad@gadieltechnologies.com",
        "gender":          "female",
        "department":      "HR and Sustainability solutions",
        "designation":     "Head HR & ESG",
        "doj":             date(2025, 11, 1),
        "role":            "hr_admin",
        "employment_type": "full_time",
        "salary_level":    5,
        "annual_ctc":      1020000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-001",
    },
    {
        "emp_code":        "GTPPT-26005",
        "first_name":      "Tushar",
        "middle_name":     "Anupam",
        "last_name":       "Kumar",
        "email":           "tushark@gadieltechnologies.com",
        "gender":          "male",
        "department":      "IT & Consultancy",
        "designation":     "Intern Dev AI",
        "doj":             date(2026, 4, 1),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25002",   # Utkarsh
    },
    {
        "emp_code":        "GTPPT-26006",
        "first_name":      "Sahil",
        "middle_name":     None,
        "last_name":       "Raturi",
        "email":           "sahilr@gadieltechnologies.com",
        "gender":          "male",
        "department":      "IT & Consultancy",
        "designation":     "Intern Dev AI",
        "doj":             date(2026, 4, 1),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25010",   # Shruti
    },
    {
        "emp_code":        "GTPPT-26007",
        "first_name":      "Ridhi",
        "middle_name":     None,
        "last_name":       "",               # single name only
        "email":           "ridhi@gadieltechnologies.com",
        "gender":          "female",
        "department":      "IT & Consultancy",
        "designation":     "Intern Dev AI",
        "doj":             date(2026, 4, 1),
        "role":            "employee",
        "employment_type": "intern",
        "salary_level":    1,
        "annual_ctc":      240000,
        "skip_loc":        False,
        "manager_new_code": "GTPL-25011",   # Akanksha
    },
]

# Leave entitlements per fiscal year (matches init_production.py)
ENTITLEMENTS = {
    "EL": 12, "SL": 12, "CL": 8,
    "ML": 90, "PatL": 10, "BL": 5, "LWP": 0,
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def add_months(d: date, months: int) -> date:
    """Add months to a date (no dateutil dependency)."""
    total = d.month - 1 + months
    year  = d.year + total // 12
    month = total % 12 + 1
    return d.replace(year=year, month=month)


def gadiel_salary_components(annual_ctc: int) -> dict:
    """
    Gadiel salary formula (from xlsx):
      Basic      = 40% of monthly CTC
      HRA        = 50% of Basic  = 20% of monthly CTC
      Medical    = 2.5% of monthly CTC
      Conveyance = 3.5% of monthly CTC  (maps to transport_allowance)
      Special    = 20% of monthly CTC
      Other      = 14% of monthly CTC   (combined into special_allowance)
      Net        = monthly CTC (no deductions per Gadiel sheet)
    """
    m = Decimal(str(annual_ctc)) / 12

    def pct(p):
        return (m * Decimal(str(p)) / 100).quantize(Decimal("0.01"))

    basic      = pct(40)
    hra        = pct(20)        # 50% of basic = 20% of gross
    medical    = pct(2.5)
    transport  = pct(3.5)       # conveyance
    special    = pct(34)        # 20% special + 14% other
    gross      = (m).quantize(Decimal("0.01"))
    # No deductions — net = gross per Gadiel xlsx
    return {
        "basic_salary":       basic,
        "hra":                hra,
        "medical_allowance":  medical,
        "transport_allowance": transport,
        "special_allowance":  special,
        "gross_salary":       gross,
        "pf_employee":        Decimal("0.00"),
        "pf_employer":        Decimal("0.00"),
        "esic_employee":      Decimal("0.00"),
        "esic_employer":      Decimal("0.00"),
        "professional_tax":   Decimal("0.00"),
        "tds":                Decimal("0.00"),
        "total_deductions":   Decimal("0.00"),
        "net_salary":         gross,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
async def run():
    async with AsyncSessionLocal() as db:
        print("\n=== Applying Gadiel official data ===\n")

        # ── Load reference tables ─────────────────────────────────────────
        result = await db.execute(select(Department))
        dept_map = {d.name: d for d in result.scalars().all()}

        result = await db.execute(select(Designation))
        desig_map = {d.name: d for d in result.scalars().all()}

        result = await db.execute(select(SalaryLevel))
        level_map = {sl.level: sl for sl in result.scalars().all()}

        result = await db.execute(select(Employee))
        emp_by_old_code = {e.emp_code: e for e in result.scalars().all()}

        # ── 1. Add new departments ────────────────────────────────────────
        print("[1/7] Adding new departments...")
        for d in NEW_DEPARTMENTS:
            if d["name"] not in dept_map:
                dept = Department(name=d["name"], code=d["code"])
                db.add(dept)
                await db.flush()
                dept_map[d["name"]] = dept
                print(f"  + {d['name']} ({d['code']})")
            else:
                print(f"  = {d['name']} already exists")
        await db.commit()

        # Reload dept_map after commit
        result = await db.execute(select(Department))
        dept_map = {d.name: d for d in result.scalars().all()}

        # ── 2. Update existing employees (pass 1: all fields except manager) ─
        print("\n[2/7] Updating 15 existing employees (pass 1: data)...")
        for old_code, upd in UPDATES.items():
            emp = emp_by_old_code.get(old_code)
            if not emp:
                print(f"  [SKIP] {old_code} not found in DB")
                continue

            # Fix last_name if needed
            if upd.get("last_name_fix"):
                emp.last_name = upd["last_name_fix"]

            # Fix email if needed
            if upd.get("email_fix"):
                emp.email = upd["email_fix"]

            # Update emp_code to official Gadiel code
            emp.emp_code = upd["new_emp_code"]

            # Department
            dept = dept_map.get(upd["department"])
            if dept:
                emp.department_id = dept.id
            else:
                print(f"  [WARN] Dept '{upd['department']}' not found for {old_code}")

            # Designation (auto-create if missing)
            desig = desig_map.get(upd["designation"])
            if not desig:
                desig = Designation(name=upd["designation"])
                db.add(desig)
                await db.flush()
                desig_map[desig.name] = desig
            emp.designation_id = desig.id

            # Dates
            emp.date_of_joining   = upd["doj"]
            emp.probation_end_date = add_months(upd["doj"], 6)

            # Role & employment type
            emp.role             = UserRole(upd["role"])
            emp.employment_type  = EmploymentType(upd["employment_type"])

            # Salary level
            sl = level_map.get(upd["salary_level"])
            if sl:
                emp.salary_level_id = sl.id

            # Geofence exemption
            emp.skip_location_check = upd.get("skip_loc", False)

            print(f"  [OK] {old_code} -> {upd['new_emp_code']} "
                  f"{emp.first_name} {emp.last_name} | "
                  f"{upd['role']} | {upd['department']}")

        await db.commit()

        # ── 3. Deactivate Kumar Kandroo ───────────────────────────────────
        print("\n[3/7] Deactivating Kumar Kandroo (GTPL013)...")
        kumar = emp_by_old_code.get("GTPL013")
        if kumar:
            kumar.is_active = False
            kumar.employment_status = EmploymentStatus.inactive
            print(f"  [OK] {kumar.emp_code} {kumar.first_name} {kumar.last_name} deactivated")
        else:
            print("  [SKIP] GTPL013 not found")
        await db.commit()

        # ── 4. Set reporting managers (pass 2 — all emp_codes updated now) ─
        print("\n[4/7] Setting reporting managers...")
        result = await db.execute(select(Employee))
        emp_by_new_code = {e.emp_code: e for e in result.scalars().all()}

        for old_code, upd in UPDATES.items():
            # Find employee by new emp_code
            new_code = upd["new_emp_code"]
            emp = emp_by_new_code.get(new_code)
            if not emp:
                continue

            mgr_code = upd.get("manager_new_code")
            if mgr_code:
                mgr = emp_by_new_code.get(mgr_code)
                if mgr:
                    emp.reporting_manager_id = mgr.id
                    print(f"  {new_code} -> reports to {mgr_code} ({mgr.first_name} {mgr.last_name})")
                else:
                    print(f"  [WARN] Manager {mgr_code} not found for {new_code}")
            else:
                emp.reporting_manager_id = None  # CEO
                print(f"  {new_code} -> no manager (CEO)")

        await db.commit()

        # ── 5. Add 5 new employees ────────────────────────────────────────
        print("\n[5/7] Adding 5 new employees...")
        result = await db.execute(select(Employee))
        emp_by_new_code = {e.emp_code: e for e in result.scalars().all()}

        # Find active geofence zone for non-exempt employees
        result = await db.execute(
            select(GeofenceZone).where(GeofenceZone.is_active == True)
        )
        geofence_zone = result.scalars().first()

        # Load shift
        result = await db.execute(
            select(Shift).where(Shift.name == "General Shift")
        )
        shift = result.scalar_one_or_none()
        if not shift:
            print("  [WARN] General Shift not found — shift assignments will be skipped")

        # Load leave types
        result = await db.execute(select(LeaveType))
        leave_types = result.scalars().all()

        new_emp_objects = []
        for nd in NEW_EMPLOYEES:
            existing = emp_by_new_code.get(nd["emp_code"])
            if existing:
                print(f"  = {nd['emp_code']} {nd['first_name']} already exists (skipped)")
                new_emp_objects.append(existing)
                continue

            # Designation
            desig = desig_map.get(nd["designation"])
            if not desig:
                desig = Designation(name=nd["designation"])
                db.add(desig)
                await db.flush()
                desig_map[desig.name] = desig

            dept = dept_map.get(nd["department"])
            sl   = level_map.get(nd["salary_level"])

            # Find manager
            mgr = emp_by_new_code.get(nd.get("manager_new_code"))

            emp = Employee(
                emp_code            = nd["emp_code"],
                first_name          = nd["first_name"],
                middle_name         = nd.get("middle_name"),
                last_name           = nd["last_name"],
                email               = nd["email"],
                gender              = Gender(nd["gender"]) if nd.get("gender") else None,
                role                = UserRole(nd["role"]),
                employment_type     = EmploymentType(nd["employment_type"]),
                employment_status   = EmploymentStatus.active,
                date_of_joining     = nd["doj"],
                probation_end_date  = add_months(nd["doj"], 6),
                department_id       = dept.id if dept else None,
                designation_id      = desig.id,
                salary_level_id     = sl.id if sl else None,
                reporting_manager_id= mgr.id if mgr else None,
                skip_location_check = nd.get("skip_loc", False),
                geofence_zone_id    = (geofence_zone.id
                                       if geofence_zone and not nd.get("skip_loc")
                                       else None),
                is_active           = True,
                password_hash       = None,  # will set password on first login
            )
            db.add(emp)
            await db.flush()
            new_emp_objects.append(emp)
            print(f"  + {nd['emp_code']} {nd['first_name']} {nd['last_name']} "
                  f"| {nd['role']} | DOJ {nd['doj']}")

        await db.commit()

        # ── 5b. Leave balances for new employees ─────────────────────────
        print("\n     Leave balances for new employees (FY 2026)...")
        result = await db.execute(select(Employee).where(
            Employee.emp_code.in_([nd["emp_code"] for nd in NEW_EMPLOYEES])
        ))
        new_emps_from_db = result.scalars().all()

        for emp in new_emps_from_db:
            for lt in leave_types:
                existing_bal = await db.execute(
                    select(LeaveBalance).where(
                        and_(
                            LeaveBalance.employee_id   == emp.id,
                            LeaveBalance.leave_type_id == lt.id,
                            LeaveBalance.year          == 2026,
                        )
                    )
                )
                if existing_bal.scalar_one_or_none():
                    continue
                entitled = ENTITLEMENTS.get(lt.code, lt.entitlement_days_annual or 0)
                if lt.code == "ML"   and emp.gender != Gender.female: entitled = 0
                if lt.code == "PatL" and emp.gender != Gender.male:   entitled = 0
                db.add(LeaveBalance(
                    id              = str(uuid.uuid4()),
                    employee_id     = emp.id,
                    leave_type_id   = lt.id,
                    year            = 2026,
                    total_entitled  = entitled,
                    carried_forward = 0,
                    accrued         = entitled,
                    used            = 0,
                    pending         = 0,
                ))
            print(f"     Leave balances: {emp.emp_code} {emp.first_name}")

        # ── 5c. Shift assignments for new employees ───────────────────────
        if shift:
            print("\n     Shift assignments for new employees...")
            for emp in new_emps_from_db:
                existing_asgn = await db.execute(
                    select(ShiftAssignment).where(ShiftAssignment.employee_id == emp.id)
                )
                if existing_asgn.scalar_one_or_none():
                    continue
                db.add(ShiftAssignment(
                    id            = str(uuid.uuid4()),
                    employee_id   = emp.id,
                    shift_id      = shift.id,
                    effective_from= emp.date_of_joining or date(2026, 4, 1),
                    effective_to  = None,
                ))
                print(f"     Shift assigned: {emp.emp_code} {emp.first_name}")

        await db.commit()

        # ── 6. Seed salary components for all 17 active employees ─────────
        print("\n[6/7] Seeding salary components (Gadiel formula)...")

        # Build combined CTC map: old code → (new code, annual_ctc, doj)
        salary_seed = {}
        for old_code, upd in UPDATES.items():
            salary_seed[upd["new_emp_code"]] = {
                "annual_ctc": upd["annual_ctc"],
                "doj":        upd["doj"],
            }
        for nd in NEW_EMPLOYEES:
            salary_seed[nd["emp_code"]] = {
                "annual_ctc": nd["annual_ctc"],
                "doj":        nd["doj"],
            }

        result = await db.execute(
            select(Employee).where(Employee.is_active == True)
        )
        all_active = result.scalars().all()

        for emp in all_active:
            seed = salary_seed.get(emp.emp_code)
            if not seed:
                print(f"  [SKIP] {emp.emp_code} {emp.first_name} — no salary data")
                continue

            # Deactivate existing current components
            existing_comps = await db.execute(
                select(SalaryComponent).where(
                    and_(
                        SalaryComponent.employee_id == emp.id,
                        SalaryComponent.is_current  == True,
                    )
                )
            )
            for old_comp in existing_comps.scalars().all():
                old_comp.is_current  = False
                old_comp.effective_to = date.today()

            effective_from = seed["doj"] if seed["doj"] <= date.today() else seed["doj"]
            comps = gadiel_salary_components(seed["annual_ctc"])
            db.add(SalaryComponent(
                employee_id     = emp.id,
                salary_level_id = emp.salary_level_id,
                effective_from  = effective_from,
                effective_to    = None,
                is_current      = True,
                **comps,
            ))
            print(f"  [OK] {emp.emp_code} {emp.first_name:12} "
                  f"CTC={seed['annual_ctc']//1000}K "
                  f"gross={comps['gross_salary']}/mo "
                  f"net={comps['net_salary']}/mo")

        await db.commit()

        # ── 7. Summary ────────────────────────────────────────────────────
        print("\n[7/7] Final summary...")
        result = await db.execute(
            select(Employee).where(Employee.is_active == True)
            .order_by(Employee.emp_code)
        )
        active_emps = result.scalars().all()

        print(f"\n  Active employees: {len(active_emps)}")
        for e in active_emps:
            print(f"    {e.emp_code:15} {e.first_name:12} {e.last_name:12} "
                  f"{e.role.value:12} {e.email}")

        result = await db.execute(
            select(Employee).where(Employee.is_active == False)
        )
        inactive = result.scalars().all()
        if inactive:
            print(f"\n  Inactive employees: {len(inactive)}")
            for e in inactive:
                print(f"    {e.emp_code:15} {e.first_name} {e.last_name} (deactivated)")

    print("\n=== Done! All Gadiel data applied. ===\n")


if __name__ == "__main__":
    asyncio.run(run())
