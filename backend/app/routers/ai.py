from datetime import date
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from groq import Groq
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_employee
from app.models.attendance import AttendanceLog
from app.models.employee import Department, Employee, UserRole
from app.models.leave import LeaveBalance
from app.models.notification import Notification, NotificationType
from app.models.payroll import Payslip
from app.models.salary import SalaryComponent
from app.models.task import Task, TaskStatus
from app.schemas.common import ok

router = APIRouter(prefix="/ai", tags=["AI"])

# Module-level Groq client (initialised lazily, shared across requests)
_groq_client: Optional[Groq] = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


FALLBACK_WEB_PROMPT = "Unable to find what you are looking for, do you want me to look into the web?"

APP_CONTEXT = """
Gadiel Technologies Pvt. Ltd. — HRMS App Modules:
- Dashboard: punch in/out, attendance summary, announcements, org chart
- Attendance & Leaves: EL(12/yr), SL(12/yr), CL(8/yr), ML(90d female), PatL(10d male), BL(5d), LWP
- Tasks: assigned tasks with status tracking
- Salary & Payslips: monthly CTC breakdown (Basic 40%, HRA 20%, Medical 2.5%, Conveyance 3.5%)
- Profile: personal info, skills, certifications, assets
- Notifications: leave alerts, announcements, birthday/anniversary greetings
- Monthly Report: authorized roles (manager, hr_admin, super_admin) only
- Shift: General Shift 9:30 AM–6:00 PM, grace window till 9:45 AM (max 3/month)
- FY: April 1 – March 31 every year; leaves renew on April 1
"""

SYSTEM_PROMPT = f"""You are Gadiel Buddy, the dedicated AI assistant for Gadiel Technologies Pvt. Ltd.

IDENTITY: You are company-first. You know everything about Gadiel Technologies, its employees, HR policies, attendance, leaves, salary structure, and HRMS features. You answer confidently from the data you have.

RULES (in strict priority order):
1. ALWAYS answer from COMPANY_DATA first — employee names, headcount, departments, policies are all known.
2. Use APP_CONTEXT for questions about HRMS features, modules, or how things work.
3. For personal data (the current user's own leaves, tasks, salary) — answer from PERSONAL_DATA.
4. Only if the question is completely outside company knowledge (e.g. external news, general coding) respond with exactly:
   {FALLBACK_WEB_PROMPT}
5. NEVER say you "don't have access" to employee info — the company data is right in COMPANY_DATA.
6. Be warm, concise, and professional. Use bullet points for lists.
7. Do not invent numbers — only state what is in the context.
"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def _is_affirmative(text: str) -> bool:
    t = (text or "").strip().lower()
    positives = {
        "yes", "y", "yeah", "yep", "sure", "ok", "okay", "please",
        "go ahead", "yes please", "look into web", "search web", "check web", "web",
    }
    return t in positives or ("yes" in t and "web" in t)


def _extract_pending_question(messages: List[ChatMessage]) -> Optional[str]:
    if len(messages) < 3:
        return None

    last_user_idx = -1
    for idx in range(len(messages) - 1, -1, -1):
        if messages[idx].role == "user":
            last_user_idx = idx
            break
    if last_user_idx == -1 or not _is_affirmative(messages[last_user_idx].content):
        return None

    fallback_idx = -1
    for idx in range(last_user_idx - 1, -1, -1):
        if messages[idx].role == "assistant" and FALLBACK_WEB_PROMPT.lower() in (messages[idx].content or "").lower():
            fallback_idx = idx
            break
    if fallback_idx == -1:
        return None

    for idx in range(fallback_idx - 1, -1, -1):
        if messages[idx].role == "user":
            return messages[idx].content
    return None


async def _web_lookup(query: str) -> Optional[str]:
    """Async web lookup via DuckDuckGo Instant Answer API."""
    try:
        params = {"q": query, "format": "json", "no_redirect": "1", "no_html": "1"}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get("https://api.duckduckgo.com/", params=params)
            data = resp.json()

        lines: List[str] = []
        abstract = data.get("AbstractText")
        abstract_url = data.get("AbstractURL")
        if abstract:
            lines.append(f"- {abstract}")
            if abstract_url:
                lines.append(f"  Source: {abstract_url}")

        count = 0
        for item in data.get("RelatedTopics") or []:
            if count >= 3:
                break
            if isinstance(item, dict) and item.get("Text"):
                lines.append(f"- {item['Text']}")
                if item.get("FirstURL"):
                    lines.append(f"  Source: {item['FirstURL']}")
                count += 1
            elif isinstance(item, dict):
                for nested in item.get("Topics", []):
                    if count >= 3:
                        break
                    if nested.get("Text"):
                        lines.append(f"- {nested['Text']}")
                        if nested.get("FirstURL"):
                            lines.append(f"  Source: {nested['FirstURL']}")
                        count += 1

        return ("I looked this up on the web:\n" + "\n".join(lines)) if lines else None
    except Exception:
        return None


async def _build_db_context(current_employee: Employee, db: AsyncSession) -> str:
    today = date.today()

    leave_result = await db.execute(
        select(func.coalesce(func.sum(LeaveBalance.available), 0)).where(
            LeaveBalance.employee_id == current_employee.id,
            LeaveBalance.year == today.year,
        )
    )
    leave_available = leave_result.scalar_one()

    attendance_result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_employee.id,
            AttendanceLog.date == today,
        )
    )
    today_attendance = attendance_result.scalar_one_or_none()

    open_tasks_result = await db.execute(
        select(func.count()).select_from(Task).where(
            Task.assigned_to_id == current_employee.id,
            Task.is_archived == False,
            Task.status != TaskStatus.done,
        )
    )
    done_tasks_result = await db.execute(
        select(func.count()).select_from(Task).where(
            Task.assigned_to_id == current_employee.id,
            Task.is_archived == False,
            Task.status == TaskStatus.done,
        )
    )
    open_tasks = int(open_tasks_result.scalar_one() or 0)
    done_tasks = int(done_tasks_result.scalar_one() or 0)

    salary_result = await db.execute(
        select(SalaryComponent)
        .where(SalaryComponent.employee_id == current_employee.id)
        .order_by(SalaryComponent.is_current.desc(), SalaryComponent.effective_from.desc())
        .limit(1)
    )
    salary = salary_result.scalar_one_or_none()

    payslip_result = await db.execute(
        select(Payslip)
        .where(Payslip.employee_id == current_employee.id)
        .order_by(Payslip.year.desc(), Payslip.month.desc(), Payslip.created_at.desc())
        .limit(1)
    )
    latest_payslip = payslip_result.scalar_one_or_none()

    team_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.reporting_manager_id == current_employee.id,
            Employee.is_active == True,
        )
    )
    team_size = int(team_result.scalar_one() or 0)

    attendance_text = "No attendance marked today."
    if today_attendance:
        attendance_text = (
            f"Today's attendance status: {today_attendance.status.value}. "
            f"Punch in: {today_attendance.punch_in}, Punch out: {today_attendance.punch_out}"
        )

    salary_text = "Salary data unavailable."
    if salary:
        salary_text = (
            f"Current salary -> gross: {salary.gross_salary}, net: {salary.net_salary}, "
            f"deductions: {salary.total_deductions}"
        )

    payslip_text = "No payslip generated yet."
    if latest_payslip:
        payslip_text = (
            f"Latest payslip: {latest_payslip.month:02d}/{latest_payslip.year}, "
            f"net salary: {latest_payslip.net_salary}, status: {latest_payslip.status.value}"
        )

    # ── Full employee roster ─────────────────────────────────────────────────
    from sqlalchemy.orm import selectinload
    roster_result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.designation))
        .where(Employee.is_active == True)
        .order_by(Employee.first_name)
    )
    all_employees = roster_result.scalars().all()

    roster_lines = []
    for e in all_employees:
        dept_name = e.department.name if e.department else "—"
        desg_name = e.designation.name if e.designation else "—"
        doj = e.date_of_joining.strftime("%b %Y") if e.date_of_joining else "—"
        roster_lines.append(
            f"  - {e.full_name} | {e.role.value} | {dept_name} | {desg_name} | Joined {doj}"
        )

    dept_result = await db.execute(
        select(Department.name, func.count(Employee.id).label("cnt"))
        .join(Employee, Employee.department_id == Department.id)
        .where(Employee.is_active == True)
        .group_by(Department.name)
        .order_by(func.count(Employee.id).desc())
    )
    dept_rows = dept_result.all()
    dept_breakdown = ", ".join(f"{r.name}: {r.cnt}" for r in dept_rows) if dept_rows else "N/A"

    company_data = (
        f"=== COMPANY_DATA ===\n"
        f"Company: Gadiel Technologies Pvt. Ltd.\n"
        f"Total active employees: {len(all_employees)}\n"
        f"Employees by department: {dept_breakdown}\n"
        f"Full employee roster:\n" + "\n".join(roster_lines) + "\n"
        f"=== END COMPANY_DATA ===\n"
    )

    personal_data = (
        f"=== PERSONAL_DATA (current user) ===\n"
        f"Name: {current_employee.full_name}\n"
        f"Role: {current_employee.role.value if current_employee.role else 'employee'}\n"
        f"Department: {current_employee.department.name if current_employee.department else '—'}\n"
        f"Leave available this FY: {leave_available}\n"
        f"Tasks -> open: {open_tasks}, done: {done_tasks}\n"
        f"Direct reports: {team_size}\n"
        f"{attendance_text}\n"
        f"{salary_text}\n"
        f"{payslip_text}\n"
        f"=== END PERSONAL_DATA ===\n"
    )

    return company_data + personal_data


@router.post("/chat", summary="Chat with Gadiel Buddy (DB-first)")
async def chat(
    body: ChatRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    if len(body.messages) == 0:
        raise HTTPException(status_code=400, detail="No messages provided")

    last_msg = body.messages[-1].content.strip()
    last_msg_lower = last_msg.lower()

    # ── Trigger-word broadcast interceptor ───────────────────────────────────
    # When a super_admin/hr_admin sends a message containing one of these words,
    # broadcast it as an announcement to all employees and show it in their
    # announcement cards on the dashboard.
    BROADCAST_TRIGGERS = ("announcement", "critical", "important", "holiday")
    first_word_lower = last_msg_lower.split()[0] if last_msg_lower.split() else ""
    if first_word_lower in BROADCAST_TRIGGERS:
        if current_employee.role in (UserRole.super_admin, UserRole.hr_admin):
            trigger_word = last_msg.split()[0].upper()
            broadcast_body = last_msg[len(trigger_word):].strip() or last_msg
            title_map = {
                "ANNOUNCEMENT": "Company Announcement",
                "CRITICAL": "Critical Alert",
                "IMPORTANT": "Important Notice",
                "HOLIDAY": "Holiday Notice",
            }
            notif_title = title_map.get(trigger_word, "Company Announcement")
            emps_result = await db.execute(select(Employee).where(Employee.is_active == True))
            for emp in emps_result.scalars().all():
                db.add(Notification(
                    employee_id=emp.id,
                    notification_type=NotificationType.announcement,
                    title=notif_title,
                    body=broadcast_body,
                ))
            await db.commit()
            return ok(data={"reply": f"[{trigger_word}] Broadcasted to all employees: \"{broadcast_body}\""})
        else:
            # Non-admin users: just pass the message to the AI normally (no broadcast)
            pass

    # ── HR-only command interceptors ─────────────────────────────────────────
    # These commands send notifications to employees and must be restricted to
    # HR / super_admin roles. Any other caller gets a 403.
    if last_msg_lower.startswith("create an announcement ") or last_msg_lower.startswith("alert "):
        if current_employee.role not in (UserRole.super_admin, UserRole.hr_admin):
            raise HTTPException(
                status_code=403,
                detail="Only HR administrators can broadcast announcements or alerts.",
            )

    if last_msg_lower.startswith("create an announcement "):
        announcement_msg = last_msg[23:].strip()
        if len(announcement_msg) > 500:
            raise HTTPException(status_code=400, detail="Announcement message too long (max 500 chars)")
        emps = await db.execute(select(Employee).where(Employee.is_active == True))
        for emp in emps.scalars().all():
            db.add(Notification(
                employee_id=emp.id,
                notification_type=NotificationType.announcement,
                title="Company Announcement",
                body=announcement_msg,
            ))
        await db.commit()
        return ok(data={"reply": f"Announcement broadcasted to all employees: '{announcement_msg}'"})

    if last_msg_lower.startswith("alert "):
        parts = last_msg.split(" ", 2)
        if len(parts) >= 3:
            target_name = parts[1]
            alert_msg = parts[2]
            if len(alert_msg) > 500:
                raise HTTPException(status_code=400, detail="Alert message too long (max 500 chars)")
            target_result = await db.execute(
                select(Employee).where(Employee.first_name.ilike(f"{target_name}%")).limit(1)
            )
            target_emp = target_result.scalar_one_or_none()
            if target_emp:
                db.add(Notification(
                    employee_id=target_emp.id,
                    notification_type=NotificationType.system,
                    title="Important Alert",
                    body=alert_msg,
                ))
                await db.commit()
                return ok(data={"reply": f"Alert successfully sent to {target_emp.full_name}."})
            return ok(data={"reply": f"Could not find an employee named '{target_name}'."})

    pending_question = _extract_pending_question(body.messages)
    if pending_question:
        web_answer = await _web_lookup(pending_question)
        if web_answer:
            return ok(data={"reply": web_answer})
        return ok(data={"reply": "Unable to find what you are looking for on the web right now."})

    db_context = await _build_db_context(current_employee, db)
    client = _get_groq_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"{db_context}\n=== APP_CONTEXT ===\n{APP_CONTEXT}"},
    ]
    for msg in body.messages[-20:]:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=messages,
            max_tokens=1024,
            temperature=0.2,
        )
        reply = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    if not reply:
        reply = FALLBACK_WEB_PROMPT
    return ok(data={"reply": reply})
