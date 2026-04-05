import asyncio
import sys
import os
from app.database import AsyncSessionLocal
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM attendance_logs"))
        count_before = result.scalar()
        print(f"Logs before: {count_before}")
        
        await db.execute(text("DELETE FROM attendance_logs"))
        await db.commit()
        
        result2 = await db.execute(text("SELECT COUNT(*) FROM attendance_logs"))
        count_after = result2.scalar()
        print(f"Logs after: {count_after}")
        print("Done — all attendance logs cleared.")

if __name__ == "__main__":
    asyncio.run(run())
