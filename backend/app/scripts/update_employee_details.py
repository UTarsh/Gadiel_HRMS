"""
Update script: Patches all 13 Gadiel employees with their complete personal data
extracted from "Personal Details updation (Responses).xlsx"

Also seeds the org-data (dept, designation, DOJ, manager) from the
GADIEL_ORG_DATA dict below — fill that in once Gadiel provides it.

Run with: python -m app.scripts.update_employee_details
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.employee import Employee, Department, Designation, UserRole, MaritalStatus, Gender


# ─────────────────────────────────────────────────────────────────────────────
# COMPLETE PERSONAL DATA — extracted from form responses
# ─────────────────────────────────────────────────────────────────────────────
EMPLOYEE_PERSONAL_DATA = [
    {
        "emp_code": "GTPL001",
        "first_name": "Karthik", "last_name": "Pandian",
        "gender": "male", "phone": "8056787017",
        "personal_email": "sauravkarthik9@gmail.com",
        "pan_number": "EHXPP2117K",
        "aadhaar_number": "455904574368",
        "blood_group": "A+",
        "marital_status": "single",
        "emergency_contact_name": "Thamilarasi",
        "emergency_contact_relation": "Mother",
        "emergency_contact_phone": "9531880710",
        "father_name": None,
        "mother_name": "Thamilarasi",
        "mother_phone": "9531880710",
    },
    {
        "emp_code": "GTPL002",
        "first_name": "Tejveer", "last_name": "Singh",
        "gender": "male", "phone": "7535966610",
        "personal_email": "tejveersingh.official08@gmail.com",
        "pan_number": "OOGPS8379J",
        "aadhaar_number": "500146695914",
        "blood_group": "A+",
        "marital_status": "single",
        "emergency_contact_name": "Mr. Mohan Singh",
        "emergency_contact_relation": "Father",
        "emergency_contact_phone": "9650378962",
        "father_name": "Mr. Mohan Singh",
        "mother_name": "Mrs. Pushpa Devi",
    },
    {
        "emp_code": "GTPL003",
        "first_name": "Akanksha", "last_name": "Bhat",
        "gender": "female", "phone": "6005135920",
        "personal_email": "akankshabhat206@gmail.com",
        "pan_number": "ECGPB7362L",
        "aadhaar_number": "368196205428",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_name": "Sheetu Koul",
        "emergency_contact_relation": "Cousin",
        "emergency_contact_phone": "9899406132",
        "father_name": "Mr. Girdhari Lal Bhat",
        "father_phone": "9419019833",
        "father_email": "girdhari.bhat62@gmail.com",
        "mother_name": "Mrs. Reeta Bhat",
        "mother_phone": "9419210322",
    },
    {
        "emp_code": "GTPL004",
        "first_name": "Shruti", "last_name": "Sharma",
        "gender": "female", "phone": "7217410741",
        "personal_email": "shrutisharma4423@gmail.com",
        "pan_number": "TDCPS0388P",
        "aadhaar_number": "308975417819",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_name": "Vivek Sharma",
        "emergency_contact_relation": "Father",
        "emergency_contact_phone": "9917518053",
        "father_name": "Mr. Vivek Sharma",
        "father_phone": "9917518053",
        "father_email": "vs8089@gmail.com",
        "mother_name": "Mrs. Deepti Sharma",
        "mother_phone": "8868868308",
        "mother_email": "ds4258990@gmail.com",
    },
    {
        "emp_code": "GTPL005",
        "first_name": "Monika", "last_name": "",
        "gender": "female", "phone": "7018538869",
        "personal_email": "monikab@gadieltechnologies.com",  # has company email — likely HR
        "pan_number": "AYHPM2786J",
        "aadhaar_number": "829567498385",
        "blood_group": "AB+",
        "marital_status": "single",
        "emergency_contact_name": "Hema Bindroo",
        "emergency_contact_relation": "Sister",
        "emergency_contact_phone": "6006433106",
        "father_name": "Mr. Raj Nath Bindroo",
        "mother_name": "Mrs. Asha Bindroo",
        "mother_phone": "7018538869",
        "mother_email": "asha.monikaonly@gmail.com",
    },
    {
        "emp_code": "GTPL006",
        "first_name": "Ashish", "last_name": "Suri",
        "gender": "male", "phone": "8825018610",
        "personal_email": "suriashish387@gmail.com",
        "pan_number": "HBWPS8031R",
        "aadhaar_number": "695901947017",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_name": "Rakesh Suri",
        "emergency_contact_relation": "Father",
        "emergency_contact_phone": "7006438815",
        "father_name": "Mr. Rakesh Suri",
        "father_phone": "7006438815",
        "father_email": "aditirakesh75@gmail.com",
        "mother_name": "Mrs. Aarti Suri",
    },
    {
        "emp_code": "GTPL007",
        "first_name": "Nikitasha", "last_name": "Sharma",
        "gender": "female", "phone": "8130300718",
        "personal_email": "nikkisharma827@gmail.com",
        "pan_number": "HGEPS5109H",
        "aadhaar_number": "338219590673",
        "blood_group": "O+",
        "marital_status": "single",
        "emergency_contact_name": "Meenakshi Sharma",
        "emergency_contact_relation": "Mother",
        "emergency_contact_phone": "9720089212",
        "father_name": "Sunil Dutt Sharma",
        "father_phone": "7014904772",
        "father_email": "bksunildutt@gmail.com",
        "mother_name": "Meenakshi Sharma",
        "mother_phone": "9720089212",
        "mother_email": "meenusharma97200@gmail.com",
    },
    {
        "emp_code": "GTPL008",
        "first_name": "Pratima", "last_name": "Maurya",
        "gender": "female", "phone": "6393001360",
        "personal_email": "rekhamaurya30499@gmail.com",
        "pan_number": None,  # not provided in form
        "aadhaar_number": "272878835106",
        "blood_group": "B+",
        "marital_status": "married",
        "spouse_name": "Pawan Maurya",
        "spouse_phone": "9506922076",
        "emergency_contact_name": "Pawan",
        "emergency_contact_relation": "Husband",
        "emergency_contact_phone": "9506922076",
        "father_name": "Dharmaraj Maurya",
    },
    {
        "emp_code": "GTPL009",
        "first_name": "Shambhavi", "last_name": "Kholia",
        "gender": "female", "phone": "8742928641",
        "personal_email": "shambhavi.kholia@gmail.com",
        "pan_number": "KSSPK7174K",
        "aadhaar_number": "744188795410",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_name": "Reena Kholia",
        "emergency_contact_relation": "Mother",
        "emergency_contact_phone": "9718859606",
        "mother_name": "Reena Kholia",
        "mother_phone": "9718859606",
        "mother_email": "reenashrish@gmail.com",
        "father_name": "Shrish Kholia",
        "father_phone": "8826140838",
        "father_email": "shrishkholia@gmail.com",
    },
    {
        "emp_code": "GTPL010",
        "first_name": "Vishal", "last_name": "Mantoo",
        "gender": "male", "phone": "7840823663",
        "personal_email": "vishalmantoo@hotmail.com",
        "pan_number": "AVQPM4523M",
        "aadhaar_number": "879850323887",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_name": "Kumar",
        "emergency_contact_phone": "9958011295",
        "father_name": "Maharaj Krishan Mantoo",
        "mother_name": "Nirmala Mantoo",
    },
    {
        "emp_code": "GTPL011",
        "first_name": "Sonali", "last_name": "Verma",
        "gender": "female", "phone": "7379365595",
        "personal_email": "sonalivermasv0409@gmail.com",
        "pan_number": "CKXPV5808C",
        "aadhaar_number": "846401606888",
        "blood_group": "B+",
        "marital_status": "single",
        "emergency_contact_phone": "8953546100",
    },
    {
        "emp_code": "GTPL012",
        "first_name": "Sneha", "last_name": "Sharma",
        "gender": "female", "phone": "8527322463",
        "personal_email": "sneha.wave@gmail.com",
        "pan_number": "QDFPS7670G",
        "aadhaar_number": "721191432924",
        "blood_group": "O+",
        "marital_status": "single",
        "emergency_contact_phone": "8527322463",
        "father_name": "Rakesh Kumar",
        "mother_name": "Seema Sharma",
        "mother_phone": "9711000756",
        "mother_email": "seema.wave@gmail.com",
    },
    {
        "emp_code": "GTPL013",
        "first_name": "Kumar", "last_name": "Kandroo",
        "gender": "male", "phone": "9958011295",
        "personal_email": "k.kandroo@gmail.com",
        "pan_number": "AWRPK0700G",
        "aadhaar_number": None,  # not provided
        "blood_group": "B+",
        "marital_status": "married",
        "father_name": "Devi Sharan Kandroo",
        "mother_name": "Pushpa Kandroo",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# ORG DATA — FILL THIS IN once Gadiel provides it
# Format: emp_code -> { department, designation, date_of_joining, reporting_manager_emp_code, role }
# ─────────────────────────────────────────────────────────────────────────────
GADIEL_ORG_DATA = {
    # Example format — replace with actual data from Gadiel:
    # "GTPL001": {
    #     "department_name": "Engineering",
    #     "designation_name": "Software Engineer",
    #     "date_of_joining": "2023-06-01",
    #     "reporting_manager_emp_code": "GTPL005",
    #     "role": "employee",   # employee / manager / hr_admin / super_admin
    # },

    # ── FILL IN BELOW ──────────────────────────────────────────────────────
    "GTPL001": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL002": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL003": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL004": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL005": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "hr_admin"},  # Monika — likely HR
    "GTPL006": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL007": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL008": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL009": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL010": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL011": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL012": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
    "GTPL013": {"department_name": None, "designation_name": None, "date_of_joining": None, "reporting_manager_emp_code": None, "role": "employee"},
}


async def update():
    async with AsyncSessionLocal() as db:
        print("[UPDATE] Updating employee personal details...")

        # Step 1: Update personal data
        for data in EMPLOYEE_PERSONAL_DATA:
            emp_code = data["emp_code"]
            result = await db.execute(select(Employee).where(Employee.emp_code == emp_code))
            emp = result.scalar_one_or_none()
            if not emp:
                print(f"  [SKIP] {emp_code} not found in database")
                continue

            fields_to_update = [
                "first_name", "last_name", "gender", "phone", "personal_email",
                "pan_number", "aadhaar_number", "blood_group", "marital_status",
                "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone",
                "spouse_name", "spouse_phone",
                "father_name", "father_phone", "father_email",
                "mother_name", "mother_phone", "mother_email",
            ]

            for field in fields_to_update:
                val = data.get(field)
                if val is not None:
                    if field == "gender":
                        setattr(emp, field, Gender(val))
                    elif field == "marital_status":
                        setattr(emp, field, MaritalStatus(val))
                    else:
                        setattr(emp, field, val)

            # Fix last_name for Monika (was stored as empty string)
            if emp.last_name == emp.first_name or not emp.last_name:
                emp.last_name = data["last_name"]

            print(f"  [OK] {emp_code} — {emp.first_name} {emp.last_name} personal data updated")

        await db.commit()

        # Step 2: Apply org data (dept, designation, DOJ, manager, role)
        print("\n[UPDATE] Applying org data...")
        all_filled = True

        for emp_code, org in GADIEL_ORG_DATA.items():
            result = await db.execute(select(Employee).where(Employee.emp_code == emp_code))
            emp = result.scalar_one_or_none()
            if not emp:
                continue

            missing = []

            if org.get("department_name"):
                dept_result = await db.execute(select(Department).where(Department.name == org["department_name"]))
                dept = dept_result.scalar_one_or_none()
                if dept:
                    emp.department_id = dept.id
            else:
                missing.append("department")

            if org.get("designation_name"):
                # Create designation if it doesn't exist
                desig_result = await db.execute(
                    select(Designation).where(Designation.name == org["designation_name"])
                )
                desig = desig_result.scalar_one_or_none()
                if not desig:
                    from app.models.employee import Designation
                    desig = Designation(name=org["designation_name"])
                    db.add(desig)
                    await db.flush()
                emp.designation_id = desig.id
            else:
                missing.append("designation")

            if org.get("date_of_joining"):
                from datetime import date
                emp.date_of_joining = date.fromisoformat(org["date_of_joining"])
            else:
                missing.append("date_of_joining")

            if org.get("role"):
                emp.role = UserRole(org["role"])

            if missing:
                all_filled = False
                print(f"  [PARTIAL] {emp_code} — {emp.first_name} {emp.last_name} | Still missing: {', '.join(missing)}")
            else:
                print(f"  [OK] {emp_code} — {emp.first_name} {emp.last_name} org data applied")

        # Step 3: Set reporting managers (second pass, after all employees updated)
        for emp_code, org in GADIEL_ORG_DATA.items():
            if org.get("reporting_manager_emp_code"):
                emp_result = await db.execute(select(Employee).where(Employee.emp_code == emp_code))
                emp = emp_result.scalar_one_or_none()
                mgr_result = await db.execute(
                    select(Employee).where(Employee.emp_code == org["reporting_manager_emp_code"])
                )
                mgr = mgr_result.scalar_one_or_none()
                if emp and mgr:
                    emp.reporting_manager_id = mgr.id

        await db.commit()

        print("\n[DONE] Employee update complete!")
        if not all_filled:
            print("\n[ACTION NEEDED] Open backend/app/scripts/update_employee_details.py")
            print("  Fill in GADIEL_ORG_DATA with department, designation, DOJ, and manager for each employee.")
            print("  Then run this script again.")


if __name__ == "__main__":
    asyncio.run(update())
