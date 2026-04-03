import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def run():
    async with AsyncSessionLocal() as db:
        # Check Monika specifically
        res = await db.execute(text("SELECT id, first_name, last_name FROM employees WHERE first_name='Monika'"))
        rows = res.fetchall()
        for eid, first, last in rows:
            if last == 'Monika':
                print(f"Fixing Monika: {first} {last} -> {first}")
                await db.execute(text("UPDATE employees SET last_name = '' WHERE id = :eid"), {"eid": eid})
        
        # General check for duplicates in name
        res = await db.execute(text("SELECT id, first_name, last_name FROM employees WHERE first_name = last_name AND first_name != ''"))
        rows = res.fetchall()
        for eid, first, last in rows:
            print(f"Fixing duplicate name for {first}: {first} {last} -> {first}")
            await db.execute(text("UPDATE employees SET last_name = '' WHERE id = :eid"), {"eid": eid})

        await db.commit()

if __name__ == '__main__':
    asyncio.run(run())
