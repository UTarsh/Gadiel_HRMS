import asyncio
import sys
import os

# Ensure backend directory is in path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import AsyncSessionLocal
from app.models.employee import Employee
from sqlalchemy import select

async def migrate_encryption():
    print("Starting encryption migration for PAN and Aadhaar...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Employee))
        employees = result.scalars().all()
        count = 0
        for emp in employees:
            updated = False
            if emp.pan_number:
                # Triggers the setattr, which passes through EncryptedString
                emp.pan_number = emp.pan_number
                updated = True
            if emp.aadhaar_number:
                emp.aadhaar_number = emp.aadhaar_number
                updated = True
            
            if updated:
                session.add(emp)
                count += 1
        
        await session.commit()
    print(f"Migration completed. Encrypted records for {count} employees.")

if __name__ == "__main__":
    asyncio.run(migrate_encryption())
