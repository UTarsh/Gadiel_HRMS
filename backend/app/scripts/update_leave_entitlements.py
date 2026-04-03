import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text
from datetime import date

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, first_name, probation_end_date FROM employees WHERE is_active=True"))
        employees = res.fetchall()
        today = date.today()
        
        print(f"Probation check as of {today}:")
        for eid, name, ped in employees:
            status = "PERMANENT"
            if ped and ped > today:
                status = "PROBATION"
            elif not ped:
                status = "PERMANENT (default)"
            print(f" - {name}: {status} (ends {ped})")
            
            # EL (code for Earned Leave) balance update
            # Probate: 12 days/yr (1/month)
            # Permanent: 24 days/yr (2/month)
            target_el = 12 if status == "PROBATION" else 24
            
            # Find the leave_type_id for EL
            lt_res = await db.execute(text("SELECT id FROM leave_types WHERE code='EL'"))
            lt_id = lt_res.scalar()
            
            if lt_id:
                # Update total_entitled for this year
                await db.execute(text("""
                    UPDATE leave_balances 
                    SET total_entitled = :ent 
                    WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :yr
                """), {"ent": target_el, "eid": eid, "ltid": lt_id, "yr": today.year})
        
        await db.commit()
        print("\nLeave balances updated (EL: 12 for Probation, 24 for Permanent).")

if __name__ == '__main__':
    asyncio.run(run())
