"""
Production initialization script.
Run ONCE after fresh deployment to make the database fully live.

What this does:
  1. Initializes leave balances for all active employees (2025-26 fiscal year)
  2. Assigns the default General Shift to all employees
  3. Adds Gadiel office geofence zone (update lat/lng when available)
  4. Prints a summary of what was created

Run with:
    cd backend
    python -m app.scripts.init_production
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.models.leave import LeaveType, LeaveBalance
from app.models.attendance import Shift, ShiftAssignment, GeofenceZone
from datetime import date, datetime
import uuid

FISCAL_YEAR = 2025  # April 2025 - March 2026

# ── Leave entitlements by code ────────────────────────────────────────────────
# Based on Gadiel Leave Policy GTPL/25-26/HRP-001
# These match what's already in the leave_types table
ENTITLEMENTS = {
    "EL":   12,   # Earned Leave — accrues monthly, blocked during probation
    "SL":   12,   # Sick Leave — granted upfront
    "CL":    8,   # Casual Leave — granted upfront
    "ML":   90,   # Maternity Leave — female only (handled in leave engine)
    "PatL": 10,   # Paternity Leave — male only
    "BL":    5,   # Bereavement Leave — all
    "LWP":   0,   # Leave Without Pay — no pre-allocated balance
}

# ── Gadiel office location (update these when they provide GPS coords) ────────
OFFICE_GEOFENCE = {
    "name": "Gadiel Technologies - Delhi Office",
    "latitude": 28.6139,    # TODO: replace with actual office lat
    "longitude": 77.2090,   # TODO: replace with actual office lng
    "radius_meters": 200,
}


async def init_leave_balances(db, employees, leave_types, year: int):
    """Create leave balance rows for every employee × every leave type."""
    created = 0
    skipped = 0

    for emp in employees:
        for lt in leave_types:
            # Check if balance already exists
            existing = await db.execute(
                select(LeaveBalance).where(
                    and_(
                        LeaveBalance.employee_id == emp.id,
                        LeaveBalance.leave_type_id == lt.id,
                        LeaveBalance.year == year,
                    )
                )
            )
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            entitled = ENTITLEMENTS.get(lt.code, lt.entitlement_days_annual or 0)

            # Gender-gated leaves: skip if not applicable
            if lt.code == "ML" and emp.gender != "female":
                entitled = 0
            if lt.code == "PatL" and emp.gender != "male":
                entitled = 0

            # EL: employees in first 6 months get 0 (accrual kicks in after probation)
            # For simplicity in initialization, grant full entitlement
            # The leave engine enforces probation rules at apply-time

            balance = LeaveBalance(
                id=str(uuid.uuid4()),
                employee_id=emp.id,
                leave_type_id=lt.id,
                year=year,
                total_entitled=entitled,
                carried_forward=0,
                accrued=entitled,
                used=0,
                pending=0,
            )
            db.add(balance)
            created += 1

    await db.flush()
    return created, skipped


async def init_shift_assignments(db, employees, shift):
    """Assign the General Shift to all employees who don't have an assignment."""
    created = 0
    skipped = 0

    for emp in employees:
        existing = await db.execute(
            select(ShiftAssignment).where(
                ShiftAssignment.employee_id == emp.id
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        assignment = ShiftAssignment(
            id=str(uuid.uuid4()),
            employee_id=emp.id,
            shift_id=shift.id,
            effective_from=date(FISCAL_YEAR, 4, 1),  # April 1, 2025
            effective_to=None,  # ongoing
        )
        db.add(assignment)
        created += 1

    await db.flush()
    return created, skipped


async def init_geofence(db):
    """Add office geofence zone if not already present."""
    existing = await db.execute(
        select(GeofenceZone).where(GeofenceZone.name == OFFICE_GEOFENCE["name"])
    )
    if existing.scalar_one_or_none():
        return False

    zone = GeofenceZone(
        id=str(uuid.uuid4()),
        name=OFFICE_GEOFENCE["name"],
        latitude=OFFICE_GEOFENCE["latitude"],
        longitude=OFFICE_GEOFENCE["longitude"],
        radius_meters=OFFICE_GEOFENCE["radius_meters"],
        is_active=True,
    )
    db.add(zone)
    await db.flush()
    return True


async def main():
    print("\n=== HRMS Production Init ===\n")

    async with AsyncSessionLocal() as db:
        # Load employees
        result = await db.execute(
            select(Employee).where(Employee.is_active == True)
        )
        employees = result.scalars().all()
        print(f"Found {len(employees)} active employees")

        # Load leave types
        result = await db.execute(select(LeaveType))
        leave_types = result.scalars().all()
        print(f"Found {len(leave_types)} leave types")

        # Load shift
        result = await db.execute(
            select(Shift).where(Shift.name == "General Shift")
        )
        shift = result.scalar_one_or_none()
        if not shift:
            print("ERROR: General Shift not found. Run seed_gadiel.py first.")
            return

        print(f"\nShift: {shift.name} ({shift.start_time} - {shift.end_time})")

        # 1. Leave balances
        print(f"\n[1/3] Initializing leave balances for fiscal year {FISCAL_YEAR}-{FISCAL_YEAR+1}...")
        created, skipped = await init_leave_balances(db, employees, leave_types, FISCAL_YEAR)
        print(f"      Created: {created}  |  Already existed (skipped): {skipped}")

        # 2. Shift assignments
        print(f"\n[2/3] Assigning shifts to employees...")
        created, skipped = await init_shift_assignments(db, employees, shift)
        print(f"      Created: {created}  |  Already assigned (skipped): {skipped}")

        # 3. Geofence
        print(f"\n[3/3] Setting up office geofence...")
        geo_created = await init_geofence(db)
        if geo_created:
            print(f"      Created geofence: {OFFICE_GEOFENCE['name']}")
            print(f"      WARNING: Using placeholder GPS coords. Update lat/lng when Gadiel provides office location.")
        else:
            print(f"      Geofence already exists (skipped)")

        await db.commit()

    print("\n=== Done ===")
    print("\nDatabase is now production-ready:")
    print("  - All employees have leave balances for 2025-26")
    print("  - All employees are assigned to General Shift")
    print("  - Office geofence zone is active")
    print("\nStill needs (from Gadiel):")
    print("  - Department/designation per employee -> run update_employee_details.py")
    print("  - Date of joining per employee        -> run update_employee_details.py")
    print("  - Reporting manager hierarchy         -> run update_employee_details.py")
    print("  - Real office GPS coordinates         -> update OFFICE_GEOFENCE in this file, re-run")


if __name__ == "__main__":
    asyncio.run(main())
