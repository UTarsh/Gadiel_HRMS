import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def run():
    async with AsyncSessionLocal() as db:
        # Check current
        result = await db.execute(text("SELECT emp_code, first_name FROM employees WHERE emp_code LIKE 'GTPPT%'"))
        rows = result.fetchall()
        print(f"Found {len(rows)} employees with GTPPT code")
        for r in rows:
            print(f" - {r}")
        
        if rows:
            print("\nUpdating all GTPPT to GTPL...")
            await db.execute(text("UPDATE employees SET emp_code = REPLACE(emp_code, 'GTPPT', 'GTPL') WHERE emp_code LIKE 'GTPPT%'"))
            await db.commit()
            print("Update complete.")

if __name__ == '__main__':
    asyncio.run(run())
