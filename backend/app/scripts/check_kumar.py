import asyncio, sys, os, logging
logging.disable(logging.CRITICAL)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.employee import Employee

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Employee.first_name, Employee.last_name, Employee.email, Employee.role, Employee.emp_code).where(Employee.is_active == True).order_by(Employee.emp_code))
        for fn, ln, email, role, code in r.all():
            print(f"  {code:16s} {fn:12s} {ln or '':12s} {role.value:12s} {email}")

asyncio.run(check())
