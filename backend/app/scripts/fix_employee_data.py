"""
Fix script:
1. Nikitasha Sharma: emp_code GTPPT-26002 -> GTPL-26002
2. Monika Bindroo: last_name "Monika" -> "Bindroo" (shows as "Monika Monika")
"""
import asyncio
from sqlalchemy import select, update
from app.database import AsyncSessionLocal


async def main():
    async with AsyncSessionLocal() as db:
        from app.models.employee import Employee

        # Fix Nikitasha emp_code
        result = await db.execute(
            select(Employee).where(Employee.emp_code == "GTPPT-26002")
        )
        nikitasha = result.scalar_one_or_none()
        if nikitasha:
            old_code = nikitasha.emp_code
            nikitasha.emp_code = "GTPL-26002"
            print(f"[OK] Nikitasha: {old_code} -> GTPL-26002")
        else:
            print("[SKIP] Nikitasha with GTPPT-26002 not found (already fixed?)")

        # Fix Monika last_name
        result2 = await db.execute(
            select(Employee).where(Employee.emp_code == "GTPL-25014")
        )
        monika = result2.scalar_one_or_none()
        if monika:
            print(f"[INFO] Monika: first_name='{monika.first_name}' last_name='{monika.last_name}'")
            if monika.last_name and monika.last_name.lower() == monika.first_name.lower():
                monika.last_name = "Bindroo"
                print(f"[OK] Monika: last_name fixed -> 'Bindroo'")
            elif not monika.last_name or monika.last_name == "":
                monika.last_name = "Bindroo"
                print(f"[OK] Monika: last_name set -> 'Bindroo'")
            else:
                print(f"[OK] Monika last_name is already '{monika.last_name}', no change needed")
        else:
            print("[SKIP] Monika (GTPL-25014) not found")

        await db.commit()
        print("\nDone. Changes committed.")


if __name__ == "__main__":
    asyncio.run(main())
