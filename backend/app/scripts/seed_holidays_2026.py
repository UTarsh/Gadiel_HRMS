"""
Seed 2026 national holidays for India.

Run with: python -m app.scripts.seed_holidays_2026

NOTE: These are standard national + common Indian holidays.
      Gadiel may want to add/remove regional holidays (e.g. Eid, Onam, Pongal)
      based on their office location (Jammu, based on employee data).
      Ask Monika (HR) for the final approved list.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import date
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.leave import Holiday


HOLIDAYS_2026 = [
    # National / Gazetted holidays
    {"name": "New Year's Day",         "date": date(2026, 1, 1),  "type": "national"},
    {"name": "Republic Day",           "date": date(2026, 1, 26), "type": "national"},
    {"name": "Maha Shivratri",         "date": date(2026, 2, 26), "type": "national"},
    {"name": "Holi",                   "date": date(2026, 3, 4),  "type": "national"},
    {"name": "Good Friday",            "date": date(2026, 4, 3),  "type": "national"},
    {"name": "Eid ul-Fitr",            "date": date(2026, 3, 21), "type": "national"},  # approx — confirm nearer date
    {"name": "Ambedkar Jayanti",       "date": date(2026, 4, 14), "type": "national"},
    {"name": "Ram Navami",             "date": date(2026, 3, 28), "type": "national"},
    {"name": "Eid ul-Adha",            "date": date(2026, 5, 28), "type": "national"},  # approx
    {"name": "Independence Day",       "date": date(2026, 8, 15), "type": "national"},
    {"name": "Janmashtami",            "date": date(2026, 8, 22), "type": "national"},
    {"name": "Gandhi Jayanti",         "date": date(2026, 10, 2), "type": "national"},
    {"name": "Navratri / Dussehra",    "date": date(2026, 10, 20),"type": "national"},
    {"name": "Diwali",                 "date": date(2026, 11, 8), "type": "national"},
    {"name": "Diwali (Laxmi Puja)",    "date": date(2026, 11, 9), "type": "national"},
    {"name": "Guru Nanak Jayanti",     "date": date(2026, 11, 3), "type": "national"},
    {"name": "Christmas",              "date": date(2026, 12, 25),"type": "national"},
]


async def seed():
    async with AsyncSessionLocal() as db:
        print("[HOLIDAYS] Seeding 2026 holidays...")

        added = 0
        skipped = 0
        for h in HOLIDAYS_2026:
            existing = await db.execute(
                select(Holiday).where(Holiday.date == h["date"])
            )
            if existing.scalar_one_or_none():
                print(f"  [SKIP] {h['name']} ({h['date']}) already exists")
                skipped += 1
                continue

            db.add(Holiday(
                name=h["name"],
                date=h["date"],
                year=2026,
                holiday_type=h["type"],
                is_active=True,
            ))
            print(f"  [ADD]  {h['name']} — {h['date']}")
            added += 1

        await db.commit()
        print(f"\n[DONE] {added} holidays added, {skipped} skipped (already existed)")
        print("\n[NOTE] Ask Monika (HR) to confirm the final list and add any regional")
        print("       holidays specific to Gadiel's office location (Jammu, J&K).")


if __name__ == "__main__":
    asyncio.run(seed())
