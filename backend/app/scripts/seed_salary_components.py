"""
Seed salary components for all 13 Gadiel employees.

HOW TO USE:
  1. Fill in SALARY_DATA below with actual CTC per employee (from Gadiel's salary structure).
  2. The script auto-calculates Basic / HRA / TA / Special Allowance / PF / ESIC / PT / TDS.
  3. Run: python -m app.scripts.seed_salary_components

SALARY BANDS (from Revised Salary Structure Aug 2025):
  L1: 2.4L - 3.0L/yr    (0-2 yrs exp)
  L2: 3.0L - 3.6L/yr    (2-4 yrs exp)
  L3: 3.6L - 5.0L/yr    (4-6 yrs exp)
  L4: 5.0L - 7.2L/yr    (6-8 yrs exp)
  L5: 7.2L - 12.0L/yr   (8-10 yrs exp)
  L6: 12.0L+/yr          (10+ yrs exp)

COMPONENT BREAKDOWN (standard Indian IT company formula):
  Basic         = 40% of CTC
  HRA           = 20% of Basic  (for Jammu/non-metro)
  Transport     = Rs. 1,600/month (fixed)
  Special Allow = Gross - Basic - HRA - Transport
  Gross         = CTC monthly (before deductions)
  PF Employee   = 12% of Basic (max Rs. 1,800/month)
  PF Employer   = 12% of Basic (max Rs. 1,800/month) — company cost
  ESIC Employee = 0.75% of Gross (if Gross <= 21,000/month)
  ESIC Employer = 3.25% of Gross (if Gross <= 21,000/month)
  Prof Tax      = Rs. 200/month (J&K state PT)
  TDS           = computed per income tax slab (simplified: 0 for low income)
  Net           = Gross - PF Employee - ESIC Employee - PT - TDS
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import date
from decimal import Decimal
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.models.salary import SalaryComponent, SalaryLevel


# ─────────────────────────────────────────────────────────────────────────────
# FILL THIS IN — get actual CTC from Gadiel's payroll records
# annual_ctc: Total annual CTC in rupees (e.g. 300000 for 3.0L/yr)
# ─────────────────────────────────────────────────────────────────────────────
SALARY_DATA = {
    "GTPL001": {"annual_ctc": None},   # TODO: fill in actual CTC
    "GTPL002": {"annual_ctc": None},
    "GTPL003": {"annual_ctc": None},
    "GTPL004": {"annual_ctc": None},
    "GTPL005": {"annual_ctc": None},   # Monika — HR Manager
    "GTPL006": {"annual_ctc": None},
    "GTPL007": {"annual_ctc": None},
    "GTPL008": {"annual_ctc": None},
    "GTPL009": {"annual_ctc": None},
    "GTPL010": {"annual_ctc": None},
    "GTPL011": {"annual_ctc": None},
    "GTPL012": {"annual_ctc": None},
    "GTPL013": {"annual_ctc": None},   # Kumar Kandroo — likely L6
}

TRANSPORT_ALLOWANCE_MONTHLY = Decimal("1600.00")
PROFESSIONAL_TAX_MONTHLY = Decimal("200.00")


def calculate_components(annual_ctc: Decimal) -> dict:
    """
    Break down annual CTC into monthly salary components.
    Returns a dict of all component fields matching SalaryComponent columns.
    """
    monthly_gross = (annual_ctc / 12).quantize(Decimal("0.01"))

    basic = (monthly_gross * Decimal("0.40")).quantize(Decimal("0.01"))
    hra = (basic * Decimal("0.20")).quantize(Decimal("0.01"))
    transport = TRANSPORT_ALLOWANCE_MONTHLY
    special = (monthly_gross - basic - hra - transport).quantize(Decimal("0.01"))
    if special < 0:
        special = Decimal("0.00")

    # PF: 12% of basic, capped at 1800
    pf_emp = min(basic * Decimal("0.12"), Decimal("1800.00")).quantize(Decimal("0.01"))
    pf_er = min(basic * Decimal("0.12"), Decimal("1800.00")).quantize(Decimal("0.01"))

    # ESIC: only if monthly gross <= 21000
    if monthly_gross <= Decimal("21000"):
        esic_emp = (monthly_gross * Decimal("0.0075")).quantize(Decimal("0.01"))
        esic_er = (monthly_gross * Decimal("0.0325")).quantize(Decimal("0.01"))
    else:
        esic_emp = Decimal("0.00")
        esic_er = Decimal("0.00")

    pt = PROFESSIONAL_TAX_MONTHLY

    # TDS: simplified — 0 if annual CTC <= 7.5L (after standard deduction + 80C)
    # For proper TDS, accountant input is needed per employee
    tds = Decimal("0.00")
    if annual_ctc > Decimal("750000"):
        # Rough estimate: 5% of taxable income above 5L threshold
        taxable_approx = annual_ctc - Decimal("50000") - Decimal("150000")  # std deduction + 80C
        if taxable_approx > Decimal("250000"):
            annual_tds = (taxable_approx - Decimal("250000")) * Decimal("0.05")
            tds = (annual_tds / 12).quantize(Decimal("0.01"))

    total_deductions = (pf_emp + esic_emp + pt + tds).quantize(Decimal("0.01"))
    net = (monthly_gross - total_deductions).quantize(Decimal("0.01"))

    return {
        "basic_salary": basic,
        "hra": hra,
        "transport_allowance": transport,
        "special_allowance": special,
        "medical_allowance": Decimal("0.00"),
        "gross_salary": monthly_gross,
        "pf_employee": pf_emp,
        "pf_employer": pf_er,
        "esic_employee": esic_emp,
        "esic_employer": esic_er,
        "professional_tax": pt,
        "tds": tds,
        "total_deductions": total_deductions,
        "net_salary": net,
    }


async def seed():
    async with AsyncSessionLocal() as db:
        print("[SALARY] Seeding salary components for all 13 employees...")

        result = await db.execute(select(Employee))
        emp_map = {e.emp_code: e for e in result.scalars().all()}

        skipped = []
        for emp_code, data in SALARY_DATA.items():
            emp = emp_map.get(emp_code)
            if not emp:
                print(f"  [SKIP] {emp_code} not found in DB")
                continue

            annual_ctc = data.get("annual_ctc")
            if not annual_ctc:
                skipped.append(emp_code)
                print(f"  [SKIP] {emp_code} {emp.first_name} {emp.last_name} — annual_ctc not set")
                continue

            # Deactivate any existing current components
            existing = await db.execute(
                select(SalaryComponent).where(
                    SalaryComponent.employee_id == emp.id,
                    SalaryComponent.is_current == True
                )
            )
            for old_comp in existing.scalars().all():
                old_comp.is_current = False
                old_comp.effective_to = date.today()

            components = calculate_components(Decimal(str(annual_ctc)))
            comp = SalaryComponent(
                employee_id=emp.id,
                salary_level_id=emp.salary_level_id,
                effective_from=date.today(),
                effective_to=None,
                is_current=True,
                **components,
            )
            db.add(comp)
            print(f"  [OK] {emp_code} {emp.first_name} {emp.last_name} — "
                  f"gross={components['gross_salary']}, net={components['net_salary']}")

        await db.commit()
        print("\n[DONE] Salary component seed complete!")

        if skipped:
            print(f"\n[ACTION NEEDED] {len(skipped)} employees still need annual_ctc:")
            print("  Edit SALARY_DATA in this script with actual figures from Gadiel payroll.")
            for code in skipped:
                emp = emp_map.get(code)
                name = f"{emp.first_name} {emp.last_name}" if emp else "?"
                print(f"    {code}: {name}")


if __name__ == "__main__":
    asyncio.run(seed())
