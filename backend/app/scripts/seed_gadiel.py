"""
Seed script: Loads Gadiel Technologies data into the database.
Run with:  python -m app.scripts.seed_gadiel

Seeds:
  - Salary levels (6 bands from Gadiel salary structure)
  - Leave types (from Gadiel Leave Policy 2025)
  - 13 employees (from Personal Details form responses)
  - Public holidays 2025-26
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.salary import SalaryLevel
from app.models.leave import LeaveType, LeaveBalance
from app.models.employee import Employee, Department, Designation, UserRole, EmploymentType, EmploymentStatus, Gender, MaritalStatus
from app.models.attendance import Shift, GeofenceZone
from app.models.leave import Holiday
from datetime import date


# ── Salary Levels (from Revised Salary Structure Aug 2025) ───────────────────
SALARY_LEVELS = [
    {"level": 1, "label": "L1", "min_experience_years": 0,  "max_experience_years": 2,  "min_ctc_annual": 240000,  "max_ctc_annual": 300000,  "description": "0-2 years experience"},
    {"level": 2, "label": "L2", "min_experience_years": 2,  "max_experience_years": 4,  "min_ctc_annual": 300000,  "max_ctc_annual": 360000,  "description": "2-4 years experience"},
    {"level": 3, "label": "L3", "min_experience_years": 4,  "max_experience_years": 6,  "min_ctc_annual": 360000,  "max_ctc_annual": 500000,  "description": "4-6 years experience"},
    {"level": 4, "label": "L4", "min_experience_years": 6,  "max_experience_years": 8,  "min_ctc_annual": 500000,  "max_ctc_annual": 720000,  "description": "6-8 years experience"},
    {"level": 5, "label": "L5", "min_experience_years": 8,  "max_experience_years": 10, "min_ctc_annual": 720000,  "max_ctc_annual": 1200000, "description": "8-10 years experience"},
    {"level": 6, "label": "L6", "min_experience_years": 10, "max_experience_years": None,"min_ctc_annual": 1200000, "max_ctc_annual": None,    "description": "10+ years experience"},
]

# ── Leave Types (from Gadiel Leave Policy GTPL/25-26/HRP-001) ────────────────
LEAVE_TYPES = [
    {
        "name": "Earned Leave",          "code": "EL",
        "description": "Accrues at 1 day/month after probation. Carry forward up to 30 days.",
        "entitlement_days_annual": 12,   "accrual_per_month": 1.0,
        "max_carryforward_days": 30,     "min_notice_days": 3,
        "is_paid": True,                 "gender_applicable": "all",
        "min_service_months": 6,         "requires_probation_completion": True,
        "auto_approve_max_days": None,
    },
    {
        "name": "Sick Leave",            "code": "SL",
        "description": "12 days/year. Medical certificate required for more than 2 consecutive days.",
        "entitlement_days_annual": 12,   "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 0,
        "document_required_after_days": 2,
        "is_paid": True,                 "gender_applicable": "all",
        "min_service_months": 0,         "requires_probation_completion": False,
        "auto_approve_max_days": 2,
    },
    {
        "name": "Casual Leave",          "code": "CL",
        "description": "6-8 days/year for short personal needs. 1 day advance notice.",
        "entitlement_days_annual": 8,    "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 1,
        "is_paid": True,                 "gender_applicable": "all",
        "min_service_months": 0,         "requires_probation_completion": False,
        "auto_approve_max_days": 1,
    },
    {
        "name": "Maternity Leave",       "code": "ML",
        "description": "3 months paid. Female employees with min 80 days service in 12 months before delivery.",
        "entitlement_days_annual": 90,   "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 30,
        "is_paid": True,                 "gender_applicable": "female",
        "min_service_months": 3,         "requires_probation_completion": False,
        "auto_approve_max_days": None,
    },
    {
        "name": "Paternity Leave",       "code": "PatL",
        "description": "5-10 working days. To be availed within 1 month of childbirth.",
        "entitlement_days_annual": 10,   "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 7,
        "is_paid": True,                 "gender_applicable": "male",
        "min_service_months": 0,         "requires_probation_completion": False,
        "auto_approve_max_days": None,
    },
    {
        "name": "Bereavement Leave",     "code": "BL",
        "description": "3-5 working days for death of immediate family (spouse, parent, child, sibling).",
        "entitlement_days_annual": 5,    "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 0,
        "is_paid": True,                 "gender_applicable": "all",
        "min_service_months": 0,         "requires_probation_completion": False,
        "auto_approve_max_days": 3,
    },
    {
        "name": "Leave Without Pay",     "code": "LWP",
        "description": "When all paid leave balances are exhausted. Requires Manager + HR approval.",
        "entitlement_days_annual": None, "accrual_per_month": None,
        "max_carryforward_days": 0,      "min_notice_days": 3,
        "is_paid": False,                "gender_applicable": "all",
        "min_service_months": 0,         "requires_probation_completion": False,
        "auto_approve_max_days": None,
    },
]

# ── Departments (to be confirmed with Gadiel — using common IT company depts) ─
DEPARTMENTS = [
    {"name": "Engineering",       "code": "ENG"},
    {"name": "Human Resources",   "code": "HR"},
    {"name": "Sales",             "code": "SALES"},
    {"name": "Marketing",         "code": "MKT"},
    {"name": "Finance",           "code": "FIN"},
    {"name": "Operations",        "code": "OPS"},
    {"name": "Management",        "code": "MGMT"},
]

# ── Employees (from Personal Details Responses form) ─────────────────────────
EMPLOYEES = [
    {"first_name": "Karthik",    "last_name": "Pandian",   "gender": "male",   "personal_email": "sauravkarthik9@gmail.com",      "phone": "8056787017", "pan": "EHXPP2117K", "blood_group": "A+",   "marital_status": "single"},
    {"first_name": "Tejveer",    "last_name": "Singh",     "gender": "male",   "personal_email": "tejveersingh.official08@gmail.com","phone": "7535966610","pan": "OOGPS8379J", "blood_group": "A+",   "marital_status": "single"},
    {"first_name": "Akanksha",   "last_name": "Bhat",      "gender": "female", "personal_email": "akankshabhat206@gmail.com",     "phone": "6005135920", "pan": "ECGPB7362L", "blood_group": "B+",   "marital_status": "single"},
    {"first_name": "Shruti",     "last_name": "Sharma",    "gender": "female", "personal_email": "shrutisharma4423@gmail.com",    "phone": "7217410741", "pan": "TDCPS0388P", "blood_group": "B+",   "marital_status": "single"},
    {"first_name": "Monika",     "last_name": "",          "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Ashish",     "last_name": "Suri",      "gender": "male",   "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Nikitasha",  "last_name": "Sharma",    "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Pratima",    "last_name": "Maurya",    "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Shambhavi",  "last_name": "Kholia",    "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Vishal",     "last_name": "Mantoo",    "gender": "male",   "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Sonali",     "last_name": "Verma",     "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Sneha",      "last_name": "Sharma",    "gender": "female", "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
    {"first_name": "Kumar",      "last_name": "Kandroo",   "gender": "male",   "personal_email": None,                             "phone": None,         "pan": None,         "blood_group": None,   "marital_status": "single"},
]

# ── Holidays 2025-26 (standard Indian national holidays) ────────────────────
HOLIDAYS_2025 = [
    {"name": "Republic Day",          "date": date(2025, 1, 26)},
    {"name": "Holi",                  "date": date(2025, 3, 14)},
    {"name": "Good Friday",           "date": date(2025, 4, 18)},
    {"name": "Eid ul-Fitr",           "date": date(2025, 3, 31)},
    {"name": "Independence Day",      "date": date(2025, 8, 15)},
    {"name": "Gandhi Jayanti",        "date": date(2025, 10, 2)},
    {"name": "Dussehra",              "date": date(2025, 10, 2)},
    {"name": "Diwali",                "date": date(2025, 10, 20)},
    {"name": "Diwali (Laxmi Puja)",   "date": date(2025, 10, 21)},
    {"name": "Christmas",             "date": date(2025, 12, 25)},
]


async def seed():
    async with AsyncSessionLocal() as db:
        print("[SEED] Seeding Gadiel Technologies database...")

        # 1. Salary Levels
        print("  > Salary levels...")
        for sl_data in SALARY_LEVELS:
            existing = await db.execute(select(SalaryLevel).where(SalaryLevel.level == sl_data["level"]))
            if not existing.scalar_one_or_none():
                db.add(SalaryLevel(**sl_data))
        await db.commit()

        # 2. Leave Types
        print("  > Leave types...")
        for lt_data in LEAVE_TYPES:
            existing = await db.execute(select(LeaveType).where(LeaveType.code == lt_data["code"]))
            if not existing.scalar_one_or_none():
                db.add(LeaveType(**{k: v for k, v in lt_data.items() if k != "document_required_after_days"},
                                 document_required_after_days=lt_data.get("document_required_after_days")))
        await db.commit()

        # 3. Departments
        print("  > Departments...")
        for dept_data in DEPARTMENTS:
            existing = await db.execute(select(Department).where(Department.code == dept_data["code"]))
            if not existing.scalar_one_or_none():
                db.add(Department(**dept_data))
        await db.commit()

        # 4. Default shift (9am - 6pm)
        print("  > Default shift...")
        from datetime import time
        existing_shift = await db.execute(select(Shift).where(Shift.name == "General Shift"))
        if not existing_shift.scalar_one_or_none():
            db.add(Shift(
                name="General Shift",
                start_time=time(9, 0),
                end_time=time(18, 0),
                grace_period_minutes=15,
                min_hours_for_half_day=4.0,
                min_hours_for_full_day=8.0,
            ))
        await db.commit()

        # 5. Employees
        print("  > Employees (13 from Gadiel)...")
        for i, emp_data in enumerate(EMPLOYEES, start=1):
            emp_code = f"GTPL{str(i).zfill(3)}"
            last_name = emp_data["last_name"] or emp_data["first_name"]  # fallback if no last name
            last_initial = emp_data["last_name"][0].lower() if emp_data["last_name"] else ""
            work_email = f"{emp_data['first_name'].lower()}{last_initial}@gadieltechnologies.com"

            existing = await db.execute(select(Employee).where(Employee.emp_code == emp_code))
            if not existing.scalar_one_or_none():
                db.add(Employee(
                    emp_code=emp_code,
                    first_name=emp_data["first_name"],
                    last_name=last_name,
                    email=work_email,
                    personal_email=emp_data.get("personal_email"),
                    phone=emp_data.get("phone"),
                    gender=Gender(emp_data["gender"]) if emp_data.get("gender") else None,
                    blood_group=emp_data.get("blood_group"),
                    pan_number=emp_data.get("pan"),
                    marital_status=MaritalStatus(emp_data["marital_status"]) if emp_data.get("marital_status") else None,
                    employment_type=EmploymentType.full_time,
                    employment_status=EmploymentStatus.active,
                    role=UserRole.employee,
                    password_hash=None,  # employee sets own password on first sign-in
                ))
        await db.commit()

        # 6. Holidays
        print("  > Holidays 2025...")
        for h in HOLIDAYS_2025:
            existing = await db.execute(select(Holiday).where(Holiday.date == h["date"]))
            if not existing.scalar_one_or_none():
                db.add(Holiday(name=h["name"], date=h["date"], year=2025, holiday_type="national"))
        await db.commit()

        print("[DONE] Seed complete!")
        print("\n[INFO] Default credentials:")
        print("   Email format: firstnameLAST_INITIAL@gadieltechnologies.com")
        print("   (e.g., karthikp@gadieltechnologies.com)")
        print("   Default password: Gadiel@2025")
        print("   (Change passwords after first login)")


if __name__ == "__main__":
    asyncio.run(seed())
