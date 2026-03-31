# HRMS Development Log

---

## Day 12 — 30 March 2026

### What We Did

#### 1. Salary & Payslips Dashboard (Premium Web Interface)

**Goal:** Implement a unified financial portal for employees to track disbursements and personal fiscal growth.

**New features:**
- **Disbursement Overview**: Real-time tracking of net salary, gross earnings, and total deductions with progress animations.
- **Compensation Topology**: Visual breakdown of Basic, HRA, and Special allowances using a custom `RingChart`.
- **Fiscal Tracker**: A personal mini-budget module for employees to log personal expenses/income alongside their organizational salary.
- **Electronic Vouchers**: Secure access to latest 5 payslips with integrated PDF download capability.
- **Premium Aesthetics**: Glassmorphic "Lightish Blue" theme consistent with the "Kinetic Culture" design system.

**Files created/modified:**
- `frontend/src/pages/salary/SalaryPage.tsx` [NEW]
- `frontend/src/App.tsx` (Route integration)
- `frontend/src/components/layout/Sidebar.tsx` (Navigation entry)

#### 2. Advanced Attendance Controls

**Problem:** Employees working remotely were blocked by office geofencing.

**New features:**
- **WFH Operational Switch**: Added a dedicated Work From Home toggle on the `AttendancePage`.
- **Seamless Bypassing**: Declaring WFH automatically bypasses geofence checks while still logging precise GPS coordinates for transparency.
- **Manager Alerts**: WFH status is reported via the notification engine to relevant managers.

#### 3. Payroll Administration Hardening

**Refinements:**
- **Authorized Guarding**: Restricted "Run Payroll" and "Payslip Upload" actions to Super Admins, HR Admins, and specifically **Vishal** and **Namrata**.
- **Manual Upload Pipeline**: Added ability for authorized admins to manually associate PDF payslips with employee records in the `MonthlyReportPage`.

---

# HRMS Development Log
**Project:** Gadiel Technologies HRMS
**Stack:** FastAPI + MySQL + React + React Native
**Goal:** Production-ready, multi-tenant HRMS â€” mobile + web

---

## Day 11 â€” 26 March 2026 (continued)

### What We Did

#### 1. WFH Attendance Policy Implemented

**Problem:** There was no way for employees to punch in from home. Also, a bug made Vishal/Monika/Pratima/Sneha always show `wfh` status (due to `skip_location_check` being misused as WFH flag).

**New policy:**
- Any employee can declare WFH at punch-in time by sending `is_wfh: true` in the request
- WFH punch-in **bypasses geofence** entirely â€” GPS location not checked
- WFH punch-out **also bypasses geofence** (detected from punch-in status on the log)
- **Late tracking still works for WFH** â€” `late_minutes` is recorded, but `status` stays `wfh` (not changed to `late`)
  - This lets HR see "WFH + late_minutes > 0" for transparency
- Attendance summary already counts WFH days separately (`wfh` count field)
- Hours still tracked: WFH employees who work < half-day threshold â†’ `absent`; 4-8 hrs â†’ `half_day`; 8+ hrs â†’ `wfh`

**Bug fixed:** `skip_location_check=True` was used as WFH flag â€” now these employees are exempt from geofence but their status is set by their actual `is_wfh` declaration at punch time (not permanently WFH).

**Files changed:**
- `backend/app/schemas/attendance.py` â€” added `is_wfh: bool = False` to `PunchInRequest`
- `backend/app/routers/attendance.py`:
  - `punch_in`: if `body.is_wfh`, skip geofence; set `status=wfh`; still compute `late_minutes`; set `remarks="WFH"`
  - `punch_out`: if `log.status == wfh`, skip geofence; keep `wfh` status through half-day check
  - `punch_in_location_valid` / `punch_out_location_valid` now correctly stores `False` for WFH (not always `True`)

**No DB migration needed** â€” `AttendanceStatus.wfh` already existed in the enum.

**API usage:**
```json
POST /attendance/punch-in
{ "latitude": 0, "longitude": 0, "is_wfh": true }
```

---

## Day 10 â€” 26 March 2026

### What We Did

#### 1. Applied Official Gadiel Data from `Requirements_asked_from_Gadiel.xlsx`
Complete DB overhaul based on official org data received from Gadiel Technologies.

**Script created:** `backend/app/scripts/apply_gadiel_data.py` (idempotent)

#### 2. New Departments Added
- **IT & Consultancy** (code: ITC) â€” primary tech department
- **HR and Sustainability solutions** (code: HRSS) â€” HR & ESG dept for Namrata

#### 3. All 15 Existing Employees Updated
Every employee got official Gadiel emp_code, correct dept/designation, DOJ, role, employment_type, and probation_end_date (DOJ + 6 months):

| Old Code   | New Code       | Name            | Role        | Dept                  | DOJ        |
|------------|----------------|-----------------|-------------|----------------------|------------|
| GTPL010    | GTPL-001       | Vishal Mantoo   | super_admin | Management            | 2015-01-01 |
| GTPL014    | GTPL-25002     | Utkarsh Jha     | manager     | IT & Consultancy      | 2025-01-06 |
| GTPL015    | GTPL-25003     | Namrata Dudha   | hr_admin    | HR & Sustainability   | 2025-11-01 |
| GTPL001    | GTPLT-25005    | Karthik Pandian | manager     | Sales                 | 2025-04-03 |
| GTPL008    | GTPL-25007     | Pratima Maurya  | employee    | IT & Consultancy      | 2025-04-15 |
| GTPL011    | GTPL-25009     | Sonali Verma    | employee    | IT & Consultancy      | 2025-08-01 |
| GTPL004    | GTPL-25010     | Shruti Sharma   | manager     | IT & Consultancy      | 2025-08-04 |
| GTPL003    | GTPL-25011     | Akanksha Bhat   | manager     | IT & Consultancy      | 2025-08-04 |
| GTPL002    | GTPLT-25013    | Tejveer Singh   | employee    | IT & Consultancy      | 2025-09-24 |
| GTPL005    | GTPL-25014     | Monika  | employee    | IT & Consultancy      | 2025-12-01 |
| GTPL012    | GTPPT-26001    | Sneha Sharma    | employee    | IT & Consultancy      | 2026-01-05 |
| GTPL007    | GTPPT-26002    | Nikitasha Sharma| employee    | IT & Consultancy      | 2026-01-05 |
| GTPL006    | GTPPT-26003    | Ashish Suri     | manager     | IT & Consultancy      | 2026-01-05 |
| GTPL009    | GTPPT-26004    | Shambhavi Kholia| employee    | IT & Consultancy      | 2026-02-23 |

Key role corrections:
- **Vishal Mantoo** â†’ `super_admin` (Director/CEO, was employee)
- **Namrata Dudha** â†’ `hr_admin` (Head HR, confirmed)
- **Karthik Pandian** â†’ `manager` + Lead Sales (was wrongly Software Engineer)
- **Monika** â†’ `employee` (Frontend Dev â€” was incorrectly set as hr_admin!)
- **Monika's last_name** fixed: `"Monika"` â†’ `"Bindroo"`, email â†’ `monikab@gadieltechnologies.com`

#### 4. Full Reporting Manager Hierarchy Set
```
Vishal (CEO)
â”œâ”€â”€ Karthik (Lead Sales)
â”‚   â”œâ”€â”€ Utkarsh (Lead AI)
â”‚   â”‚   â”œâ”€â”€ Tejveer (Intern)
â”‚   â”‚   â””â”€â”€ Tushar (Intern, starts Apr 2026)
â”‚   â”œâ”€â”€ Shruti (Data & AI)
â”‚   â”‚   â”œâ”€â”€ Shambhavi (Intern)
â”‚   â”‚   â””â”€â”€ Sahil (Intern, starts Apr 2026)
â”‚   â”œâ”€â”€ Akanksha (Python Dev)
â”‚   â”‚   â”œâ”€â”€ Pratima (Python API)
â”‚   â”‚   â”œâ”€â”€ Sonali (Backend AI)
â”‚   â”‚   â””â”€â”€ Ridhi (Intern, starts Apr 2026)
â”‚   â”œâ”€â”€ Nikitasha (Intern)
â”‚   â””â”€â”€ Ashish (Intern Lead)
â”‚       â””â”€â”€ Sneha (Intern)
â”œâ”€â”€ Namrata (Head HR)
â””â”€â”€ Monika (Frontend Dev)
```

#### 5. 3 New Employees Added
| Emp Code    | Name                | Email                         | DOJ        | Manager  |
|-------------|---------------------|-------------------------------|------------|----------|
| GTPPT-26005 | Tushar Anupam Kumar | tushark@gadieltechnologies.com| 2026-04-01 | Utkarsh  |
| GTPPT-26006 | Sahil Raturi        | sahilr@gadieltechnologies.com | 2026-04-01 | Shruti   |
| GTPPT-26007 | Ridhi               | ridhi@gadieltechnologies.com  | 2026-04-01 | Akanksha |

All 3 assigned: IT & Consultancy dept, L1 salary level, `intern` employment type,
probation_end_date = 2026-10-01, FY2026 leave balances (EL/SL/CL etc.), General Shift.

#### 6. Kumar Kandroo Deactivated
- `GTPL013` Kumar Kandroo: `is_active=False`, `employment_status=inactive`
- Not in official Gadiel employee list â†’ deactivated

#### 7. Salary Components Seeded â€” Gadiel Formula from xlsx
All 17 active employees now have salary components using the official Gadiel formula:

```
Basic         = 40% of monthly CTC
HRA           = 50% of Basic  = 20% of monthly CTC
Medical       = 2.5% of monthly CTC
Conveyance    = 3.5% of monthly CTC  (â†’ transport_allowance in DB)
Special Allow = 20% of monthly CTC   } combined into
Other         = 14% of monthly CTC   } special_allowance (34% total)
Gross         = monthly CTC (100%)
Net           = monthly CTC (no deductions per Gadiel sheet)
```

Salary highlights:
- Karthik Pandian: CTC 13L/yr â†’ gross â‚¹1,08,333/mo
- Namrata Dudha:   CTC 10.2L/yr â†’ gross â‚¹85,000/mo
- Vishal Mantoo:   CTC 3.6L/yr â†’ gross â‚¹30,000/mo (as per Gadiel xlsx)
- Most interns:    CTC 2.4L/yr â†’ gross â‚¹20,000/mo
- Shambhavi:       CTC 1.8L/yr â†’ gross â‚¹15,000/mo

#### 8. Email Fix â€” Namrata Dudha
Ran `update_emails.py` which fixed:
- `namrata@gadieltechnologies.com` â†’ `namratad@gadieltechnologies.com`

### DB State After Day 10
- **17 active employees**, 1 inactive (Kumar Kandroo)
- All emp_codes in official Gadiel format (GTPL-001, GTPLT-xxxxx, GTPPT-xxxxx)
- Full reporting hierarchy set
- All salary components seeded (Gadiel formula)
- 2 new departments: IT & Consultancy, HR and Sustainability solutions
- Leave balances: FY2025 for existing 15, FY2026 for 3 new interns

### Still Pending (from Gadiel)
- All 17 employees need to set their own passwords (via setup-password flow)
- Office GPS coordinates for geofencing (currently: Wave Infratech Noida Sector 3, 28.581196Â°N 77.3210907Â°E)
- Regional holidays for Jammu office (2026 list has national holidays only)
- Confirm if Vishal's CTC (3.6L/yr) is correct or if it was meant to be higher

---

## Day 9 â€” 25 March 2026

### What We Did

#### 1. Shift Policy Updated â€” 9:30 AM to 6:00 PM
- Updated `General Shift` in DB: `start_time=09:30`, `end_time=18:00`, `grace_period_minutes=15`
- Grace window: **9:30 AM â†’ 9:45 AM** (allowed max **3 times per month**)
  - 4th+ time in the grace window â†’ automatically marked **late**
  - After 9:45 AM â†’ always **late**, no exceptions
- All time comparisons now use **IST (Asia/Kolkata)** timezone via `zoneinfo.ZoneInfo`
  â€” previously was UTC-only which would give wrong late calculations for Indian office hours

#### 2. Week-Off Saturday Rule Implemented
- Every **2nd Saturday** of the month â†’ `week_off` (office closed)
- Every **last Saturday** of the month â†’ `week_off` (office closed)
- If only one Saturday in a month â†’ that Saturday is off
- Punch-in on a week-off Saturday returns HTTP 400: `"Today is a week-off Saturday. Office is closed."`
- Function: `is_week_off_saturday(d: date)` in `routers/attendance.py`

#### 3. Attendance Router â€” Full Rewrite of Punch Logic
- New helper: `count_grace_uses_this_month()` â€” queries attendance_logs to count how many times this month the employee punched in during the grace window and was NOT marked late
- `punch_in` flow now:
  1. Check week-off Saturday â†’ block if true
  2. Check geofence â†’ block if outside 100m
  3. Determine IST punch time vs shift_start (9:30)
  4. If before/at 9:30 â†’ present
  5. If 9:30â€“9:45 AND grace_uses < 3 â†’ present (grace used)
  6. If 9:30â€“9:45 AND grace_uses >= 3 â†’ late
  7. If after 9:45 â†’ always late
- Response message now includes late info: `"Punch in recorded â€” marked late (12 min)"`
- All `date.today()` calls replaced with `datetime.now(timezone.utc).astimezone(IST).date()` to get correct IST date

#### 4. Two New Employees Added
| Code | Name | Email | Dept | Designation | DOJ |
|---|---|---|---|---|---|
| GTPL014 | Utkarsh Jha | utkarshj@gadieltechnologies.com | Engineering | Lead Data & AI Engineer | 6 Jan 2026 |
| GTPL015 | Namrata Dudha | namrata@gadieltechnologies.com | Human Resources | Head HR | MISSING |
- Both have leave balances (2026) and General Shift assignment created

#### 5. Geofence Zone Set â€” Wave Infratech, Noida Sector 3
- Updated existing zone: `lat=28.581196, lng=77.3210907, radius=100m` (was 200m)
- Coordinates sourced from Justdial listing for Wave Infratech Corporate Office, Sector 3 Noida
- 10 employees assigned to zone (must be within 100m to punch)
- 5 employees exempt (`skip_location_check=True`): Monika, Vishal, Kumar, Pratima, Sneha

#### 6. Punch-in/out â€” Hard Block on Outside Range
- Changed from "flag and allow" to "block entirely"
- If outside geofence â†’ HTTP 400: `"Please be in the range of the office to punch your attendance."`
- `punch_in_location_valid` and `punch_out_location_valid` always `True` now (since invalid ones never reach DB)

---

## Day 8 â€” 24 March 2026

### Three-Phase Roadmap to Production

After reviewing the full devlog, the remaining work was divided into three phases:

---

#### Phase 1 â€” Data Foundation & DB Schema (DONE TODAY)
**Goal:** Complete all DB/schema work so the system runs on real data.

**What was built:**

##### New SQLAlchemy Models
| File | Tables | Purpose |
|---|---|---|
| `models/payroll.py` | `payroll_runs`, `payslips` | Monthly payroll processing & per-employee payslips |
| `models/document.py` | `documents` | Employee document store (offer letters, ID proofs, payslips) |
| `models/audit_log.py` | `audit_logs` | Immutable event trail for HR compliance |

##### Alembic Migration
- Generated and applied: `35011c6d9553_add_payroll_documents_audit_tables.py`
- All 4 new tables live in `hrms_db`

##### Seed Scripts Created
| Script | Purpose | Status |
|---|---|---|
| `scripts/seed_org_data.py` | Sets dept/designation/DOJ/manager/salary_level for all 13 employees | Partial â€” dept+designation SET, DOJ+salary_level pending Gadiel |
| `scripts/seed_salary_components.py` | Sets salary breakdown per employee (auto-calculates Basic/HRA/PF/etc from CTC) | Ready â€” needs actual CTC from Gadiel |
| `scripts/seed_holidays_2026.py` | 2026 national holiday calendar | DONE â€” 17 holidays seeded |

##### Org Data Status (after seed_org_data run)
| Employee | Dept | Designation | DOJ | Salary Level |
|---|---|---|---|---|
| Karthik Pandian | Engineering | Software Engineer | NEEDED | NEEDED |
| Tejveer Singh | Engineering | Software Engineer | NEEDED | NEEDED |
| Akanksha Bhat | Engineering | Software Engineer | NEEDED | NEEDED |
| Shruti Sharma | Engineering | Software Engineer | NEEDED | NEEDED |
| Monika | Human Resources | HR Manager | NEEDED | NEEDED |
| Ashish Suri | Engineering | Software Engineer | NEEDED | NEEDED |
| Nikitasha Sharma | Engineering | Software Engineer | NEEDED | NEEDED |
| Pratima Maurya | Engineering | Software Engineer | NEEDED | NEEDED |
| Shambhavi Kholia | Engineering | Software Engineer | NEEDED | NEEDED |
| Vishal Mantoo | Engineering | Software Engineer | NEEDED | NEEDED |
| Sonali Verma | Engineering | Software Engineer | NEEDED | NEEDED |
| Sneha Sharma | Engineering | Software Engineer | NEEDED | NEEDED |
| Kumar Kandroo | Management | Director | NEEDED | L6 set |

**Action needed from Gadiel:**
1. Date of joining for each employee â†’ fill in `ORG_DATA` in `seed_org_data.py`, re-run
2. Annual CTC per employee â†’ fill in `SALARY_DATA` in `seed_salary_components.py`, run once
3. Confirm/correct department & designation assignments
4. Office GPS coordinates â†’ update geofence zone via web admin `/geofence` page

---

#### Phase 2 â€” Feature Completion (NEXT)
**Goal:** Complete mobile app + payroll engine + AI HR assistant

**Mobile (React Native):**
- Leaves screen â€” apply, view history, pending approvals
- Attendance log screen â€” monthly calendar, daily punch times
- Profile screen â€” view/edit personal info, change password
- Full navigation wiring between all screens
- Push notification screen
- Geofence location validation on punch-in/out

**Backend (new features):**
- Payroll calculation engine (`services/payroll_service.py`)
- Payroll CRUD endpoints (`routers/payroll.py`)
- Payslip PDF generation (ReportLab or WeasyPrint)
- Document upload/management endpoints (`routers/documents.py`)
- Reports API â€” attendance summary, leave summary by dept (`routers/reports.py`)
- AI HR assistant â€” Claude API integration (leave policy Q&A, salary queries)

**Web Frontend:**
- Payroll module pages (run payroll, view/approve payslips)
- Reports & analytics dashboard (dept-wise attendance, leave trends)
- Document management UI (upload, view, verify documents)

---

#### Phase 3 â€” Production Hardening (LAST)
**Goal:** Make it deployable, secure, and maintainable

**Security:**
- CORS locked to production domain (remove `*`)
- Rate limiting on `/auth/login` (slowapi â€” 5 req/min)
- Refresh token rotation + Redis token blacklist
- PAN/Aadhaar encryption at rest (Fernet symmetric encryption)
- Input validation: email format, phone regex, PAN regex

**Background Jobs (APScheduler or Celery):**
- Monthly EL accrual: +1 day for every employee on 1st of each month
- Leave balance year-reset: carry-forward EL on Jan 1st
- Payroll auto-scheduling: draft payroll run on 25th of each month
- Push notification retry queue

**Infrastructure:**
- Docker Compose production config (separate app/db/redis services)
- Nginx reverse proxy config with SSL termination
- Automated MySQL backup (mysqldump cron)
- Structured JSON logging (replace print() with proper logger)
- Health check endpoint with DB ping

**Testing:**
- Unit tests: `leave_service.py` decision engine (edge cases)
- Integration tests: auth flow (login â†’ refresh â†’ me)
- API tests: all 41+ endpoints (pytest + httpx)

**Multi-tenant Foundation:**
- `companies` table (for future SaaS)
- `company_id` FK on employees, leave_types, geofence_zones
- Tenant isolation middleware (JWT claims carry company_id)

---

**Current DB Table Count: 19 tables**
```
employees, departments, designations, salary_levels, salary_components
leave_types, leave_balances, leave_requests, holidays
attendance_logs, shifts, shift_assignments, geofence_zones
device_tokens, notifications
payroll_runs, payslips, documents, audit_logs   â† NEW (Phase 1)
```

---

## Day 1 â€” 12 March 2026

### What We Did

#### 1. Read and Analysed All Gadiel Data
Before writing a single line of code, we read every file Gadiel provided:

| File | What It Told Us |
|---|---|
| `Gaidel_Database.xlsx` | A requirements wishlist â€” 9 categories of HR data fields to capture |
| `Personal Details (Responses).xlsx` | Real form responses from all 13 employees â€” name, PAN, Aadhaar, blood group, emergency contact |
| `Revised Salary Structure Aug 2025.xlsx` | 6-level salary band (L1 = 2.4L/yr to L6 = 12L+/yr) |
| `Leave Policy 2025 final.pdf` | Fully defined leave rules â€” EL, SL, CL, Maternity, Paternity, Bereavement, LWP |
| `Company Policy 2025.pdf` | Notice period (1 month), conduct rules, no leaves during notice period |

**Key gaps identified** (still need from Gadiel):
- Department and designation per employee
- Date of joining per employee
- Reporting manager hierarchy
- Which salary level each employee is on
- Office GPS coordinates (for geofencing)
- Specific holiday dates for their office
- Confirmed shift timings

---

#### 2. Designed the Full Database Schema
Based on the data, we designed **15 tables**:

```
employees          â€” Core employee profiles (all personal + org fields)
departments        â€” Engineering, HR, Sales, Marketing, Finance, Operations, Management
designations       â€” Job titles per department
salary_levels      â€” 6 salary bands (L1-L6)
salary_components  â€” Per-employee salary breakdown (Basic, HRA, TA, PF, TDS, etc.)
leave_types        â€” EL, SL, CL, ML, PatL, BL, LWP
leave_balances     â€” Per employee, per leave type, per year (tracks used/pending/available)
leave_requests     â€” Every leave application with status and approval trail
holidays           â€” Public holiday calendar
attendance_logs    â€” Daily punch-in/out records with GPS + selfie data
shifts             â€” Shift definitions (start/end time, grace period)
shift_assignments  â€” Which employee is on which shift
geofence_zones     â€” Office GPS coordinates + radius for location validation
device_tokens      â€” Mobile app FCM push notification tokens
notifications      â€” In-app + push notification history
```

---

#### 3. Built the Backend â€” FastAPI + MySQL

**Tech choices and why:**
- **FastAPI** â€” async-native, auto-generates Swagger docs, ideal for mobile + web API
- **MySQL** (your existing installation) â€” instead of PostgreSQL, reusing what you have
- **SQLAlchemy 2.0 async** â€” modern ORM with full async support via `aiomysql`
- **Alembic** â€” database migration tool (version controls your schema changes)
- **JWT** â€” stateless auth that works identically on mobile and web
- **bcrypt 4.0.1** â€” pinned because passlib is incompatible with bcrypt 5.x

**File structure created:**
```
backend/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ main.py              â† FastAPI app, CORS setup, router registration
â”‚   â”œâ”€â”€ config.py            â† All settings loaded from .env file
â”‚   â”œâ”€â”€ database.py          â† Async MySQL connection pool
â”‚   â”œâ”€â”€ models/              â† SQLAlchemy table definitions
â”‚   â”‚   â”œâ”€â”€ employee.py      â† Employee, Department, Designation, DeviceToken
â”‚   â”‚   â”œâ”€â”€ leave.py         â† LeaveType, LeaveBalance, LeaveRequest, Holiday
â”‚   â”‚   â”œâ”€â”€ attendance.py    â† AttendanceLog, Shift, ShiftAssignment, GeofenceZone
â”‚   â”‚   â”œâ”€â”€ salary.py        â† SalaryLevel, SalaryComponent
â”‚   â”‚   â””â”€â”€ notification.py  â† Notification
â”‚   â”œâ”€â”€ schemas/             â† Pydantic request/response shapes
â”‚   â”‚   â”œâ”€â”€ common.py        â† Standard {success, message, data} envelope
â”‚   â”‚   â”œâ”€â”€ auth.py          â† Login, token, FCM device token
â”‚   â”‚   â”œâ”€â”€ employee.py      â† Employee create/update/read
â”‚   â”‚   â”œâ”€â”€ leave.py         â† Leave apply/action/balance
â”‚   â”‚   â””â”€â”€ attendance.py    â† Punch-in/out, summary, correction
â”‚   â”œâ”€â”€ routers/             â† API endpoint handlers
â”‚   â”‚   â”œâ”€â”€ auth.py          â† /login, /refresh, /change-password, /register-device-token
â”‚   â”‚   â”œâ”€â”€ employees.py     â† Employee CRUD, departments, designations
â”‚   â”‚   â”œâ”€â”€ leaves.py        â† Apply, approve/reject, cancel, balance
â”‚   â”‚   â”œâ”€â”€ attendance.py    â† Punch-in/out, today, summary, correction
â”‚   â”‚   â””â”€â”€ notifications.py â† Bell, mark-read
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ leave_service.py â† Leave decision engine (auto-approve/reject logic)
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â””â”€â”€ auth.py          â† JWT guard, RBAC role checks
â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â””â”€â”€ security.py      â† bcrypt hashing, JWT create/decode
â”‚   â””â”€â”€ scripts/
â”‚       â””â”€â”€ seed_gadiel.py   â† One-time data seeding script
â”œâ”€â”€ alembic/                 â† Migration files (alembic upgrade head)
â”œâ”€â”€ .env                     â† Your local config (never commit this)
â”œâ”€â”€ requirements.txt         â† All Python dependencies with pinned versions
â””â”€â”€ Dockerfile               â† Container build for deployment
```

---

#### 4. Built the Leave Decision Engine
Located in [backend/app/services/leave_service.py](backend/app/services/leave_service.py)

Encodes Gadiel's actual leave policy rules:

```
Employee applies for leave
         |
         v
1. Balance check â€” does employee have enough days?
         |
         v
2. Notice period check â€” is there enough advance notice?
         |
         v
3. Probation check â€” EL blocked during probation period
         |
         v
4. Auto-approve check â€” is it within auto-approval threshold?
         |
    Yes  |  No
         v
   AUTO_APPROVED    SEND_TO_MANAGER    REJECTED
```

Rules from Gadiel policy implemented:
- EL: requires probation completion, 3 days notice
- SL: auto-approved up to 2 days, medical cert needed beyond
- CL: auto-approved up to 1 day, 1 day notice
- LWP: allowed only when all balances exhausted
- Maternity/Paternity: gender-gated

---

#### 5. Mobile-First API Design
Every endpoint returns the same JSON envelope â€” React Native and React web both consume this identically:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { ... }
}
```

Mobile-specific endpoints built:
- `POST /api/v1/auth/register-device-token` â€” registers FCM token for push notifications
- `GET /api/v1/attendance/today` â€” single call for mobile home screen widget
- All list endpoints paginated (`?page=1&per_page=20`)
- GPS geofence validation built into punch-in/out

---

#### 6. Ran Migrations and Seeded Data

Migration created and applied:
```
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

Seeded Gadiel's data:
```
employees:      13 rows  (all Gadiel staff from Personal Details form)
salary_levels:   6 rows  (L1=2.4L to L6=12L+ from salary structure)
leave_types:     7 rows  (EL, SL, CL, ML, PatL, BL, LWP from Leave Policy)
departments:     7 rows  (Engineering, HR, Sales, Marketing, Finance, Ops, Mgmt)
shifts:          1 row   (General Shift: 9am-6pm, 15 min grace)
holidays:       10 rows  (Indian national holidays 2025)
```

---

#### 7. Verified Everything Works

Server running at `http://localhost:8000`
Login test passed:
```bash
POST /api/v1/auth/login
{ "email": "karthik.pandian@gadieltech.com", "password": "Gadiel@2025" }
# Returns JWT access + refresh tokens
```

---

### All 35 API Endpoints Live

| Method | Endpoint | Who Can Call |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Anyone |
| POST | /api/v1/auth/refresh | Any logged-in |
| POST | /api/v1/auth/change-password | Any logged-in |
| POST | /api/v1/auth/register-device-token | Any logged-in (mobile) |
| GET | /api/v1/auth/me | Any logged-in |
| GET | /api/v1/employees | Manager / HR |
| POST | /api/v1/employees | HR only |
| GET | /api/v1/employees/me | Any logged-in |
| GET | /api/v1/employees/{id} | Role-scoped |
| PATCH | /api/v1/employees/{id} | Role-scoped |
| DELETE | /api/v1/employees/{id} | HR only |
| GET | /api/v1/employees/departments/all | Any logged-in |
| GET | /api/v1/employees/designations/all | Any logged-in |
| GET | /api/v1/leaves/types | Any logged-in |
| GET | /api/v1/leaves/balance | Any logged-in |
| GET | /api/v1/leaves/balance/{emp_id} | HR / Manager |
| POST | /api/v1/leaves/apply | Any employee |
| GET | /api/v1/leaves/my | Any employee |
| GET | /api/v1/leaves/team | Manager / HR |
| PATCH | /api/v1/leaves/{id}/action | Manager / HR |
| PATCH | /api/v1/leaves/{id}/cancel | Any employee (own) |
| POST | /api/v1/attendance/punch-in | Any employee |
| POST | /api/v1/attendance/punch-out | Any employee |
| GET | /api/v1/attendance/today | Any employee |
| GET | /api/v1/attendance/my | Any employee |
| GET | /api/v1/attendance/summary/{emp_id} | Role-scoped |
| PATCH | /api/v1/attendance/logs/{id}/correct | HR only |
| GET | /api/v1/notifications | Any employee |
| PATCH | /api/v1/notifications/{id}/read | Any employee |
| PATCH | /api/v1/notifications/read-all | Any employee |

---

### Known Gaps / To-Do Before Production

- [x] ~~Update all employees with complete personal data from form~~
- [ ] Assign departments + designations to each Gadiel employee â€” **needs Gadiel input**
- [ ] Set dates of joining for each employee â€” **needs Gadiel input**
- [ ] Set up reporting manager hierarchy â€” **needs Gadiel input**
- [ ] Add office GPS coordinates to geofence_zones table â€” **Gadiel to provide later**
- [ ] Confirm Gadiel-specific holiday calendar dates â€” **Gadiel to provide later**
- [ ] Initialize leave balances for each employee for 2025-26

To complete the pending org fields: open [backend/app/scripts/update_employee_details.py](backend/app/scripts/update_employee_details.py), fill in `GADIEL_ORG_DATA`, then run `python -m app.scripts.update_employee_details`.

---

### How to Run (Daily)

```bash
# 1. Start MySQL (run as Administrator in a separate terminal)
net start MySQL80

# 2. Start API server
cd C:/Users/utkku/OneDrive/Desktop/my_products/HRMS/backend
python -m uvicorn app.main:app --reload

# 3. Open Swagger docs
# Browser: http://localhost:8000/docs
```

---

## Day 1 (Session 2) â€” 12 March 2026

### What We Did

#### 8. Deep-Read the Personal Details Form â€” All 13 Employees

Re-read the Personal Details spreadsheet with all 13 columns and all 14 rows (1 header + 13 responses). Extracted the following for every employee:

| Emp Code | Name | New Data Found |
|---|---|---|
| GTPL001 | Karthik Pandian | PAN, Aadhaar, A+ blood, emergency contact (mother Thamilarasi) |
| GTPL002 | Tejveer Singh | PAN, Aadhaar, A+ blood, emergency contact (father Mohan Singh) |
| GTPL003 | Akanksha Bhat | PAN, Aadhaar, B+ blood, emergency contact (cousin Sheetu Koul), both parent details |
| GTPL004 | Shruti Sharma | PAN, Aadhaar, B+ blood, both parent details with emails |
| GTPL005 | Monika | Last name confirmed as Bindroo, AB+ blood, personal email is **company email** (monikab@gadieltechnologies.com) â†’ role set to hr_admin |
| GTPL006 | Ashish Suri | PAN, Aadhaar, B+ blood, father details |
| GTPL007 | Nikitasha Sharma | PAN, Aadhaar, O+ blood, both parent details with emails |
| GTPL008 | Pratima Maurya | No PAN (not provided), married status, husband = Pawan Maurya |
| GTPL009 | Shambhavi Kholia | PAN, Aadhaar, B+ blood, both parent details with emails |
| GTPL010 | Vishal Mantoo | PAN, Aadhaar, B+ blood |
| GTPL011 | Sonali Verma | PAN, Aadhaar, B+ blood |
| GTPL012 | Sneha Sharma | PAN, Aadhaar, O+ blood, mother details |
| GTPL013 | Kumar Kandroo | PAN, no Aadhaar provided, married status |

**Key finding:** `Gaidel_Database.xlsx` is a requirements wishlist document â€” it does NOT contain per-employee data. Department, designation, date of joining, and reporting manager are genuinely not in any of the provided files.

---

#### 9. Re-confirmed Salary Structure

All 6 levels verified from `Revised Salary Structure August 2025.xlsx`:

| Level | Experience | CTC Range |
|---|---|---|
| L1 | 0â€“2 yrs | 2.40 lacs/annum |
| L2 | 2â€“4 yrs | 3.0â€“3.60 lacs/annum |
| L3 | 4â€“6 yrs | 3.60â€“5.00 lacs/annum |
| L4 | 6â€“8 yrs | 5.00â€“7.20 lacs/annum |
| L5 | 8â€“10 yrs | >7.20 lacs/annum |
| L6 | >10 yrs | >12 lacs/annum |

---

#### 10. Updated All 13 Employees in the Database

Wrote and ran [backend/app/scripts/update_employee_details.py](backend/app/scripts/update_employee_details.py).

**What it updates:**
- Complete personal details for all 13 employees (phone, PAN, Aadhaar, blood group, marital status, emergency contact, parent details, spouse details)
- Monika's last name corrected to "Bindroo", role set to `hr_admin`
- Pratima Maurya's married status + husband details saved
- Kumar Kandroo's married status saved

**Script is reusable** â€” it also contains a `GADIEL_ORG_DATA` dict at the top. Once Gadiel provides department/designation/DOJ/manager info, fill it in and re-run the script to complete the org setup.

**Current database state after update:**

| Emp Code | Name | Phone | PAN | Blood | Marital |
|---|---|---|---|---|---|
| GTPL001 | Karthik Pandian | 8056787017 | EHXPP2117K | A+ | single |
| GTPL002 | Tejveer Singh | 7535966610 | OOGPS8379J | A+ | single |
| GTPL003 | Akanksha Bhat | 6005135920 | ECGPB7362L | B+ | single |
| GTPL004 | Shruti Sharma | 7217410741 | TDCPS0388P | B+ | single |
| GTPL005 | Monika | 7018538869 | AYHPM2786J | AB+ | single |
| GTPL006 | Ashish Suri | 8825018610 | HBWPS8031R | B+ | single |
| GTPL007 | Nikitasha Sharma | 8130300718 | HGEPS5109H | O+ | single |
| GTPL008 | Pratima Maurya | 6393001360 | â€” | B+ | married |
| GTPL009 | Shambhavi Kholia | 8742928641 | KSSPK7174K | B+ | single |
| GTPL010 | Vishal Mantoo | 7840823663 | AVQPM4523M | B+ | single |
| GTPL011 | Sonali Verma | 7379365595 | CKXPV5808C | B+ | single |
| GTPL012 | Sneha Sharma | 8527322463 | QDFPS7670G | O+ | single |
| GTPL013 | Kumar Kandroo | 9958011295 | AWRPK0700G | B+ | married |

**Still missing from every employee (waiting on Gadiel):**
- Department assignment
- Designation / job title
- Date of joining
- Reporting manager

---

### Current Project Status

| Component | Status |
|---|---|
| Backend API (FastAPI) | LIVE at http://localhost:8000 |
| Database (MySQL) | 15 tables, all seeded |
| Employee personal data | Complete for all 13 |
| Employee org data | Pending â€” need dept/designation/DOJ/manager from Gadiel |
| Leave policy rules | Encoded in leave engine |
| Auth (JWT) | Working â€” tested with login |
| React web frontend | Not started |
| React Native mobile app | Not started |
| AI HR assistant | Not started |

---

### How to Complete the Org Data (When Gadiel Provides It)

1. Open [backend/app/scripts/update_employee_details.py](backend/app/scripts/update_employee_details.py)
2. Find the `GADIEL_ORG_DATA` section (around line 130)
3. Fill in for each employee:
```python
"GTPL001": {
    "department_name": "Engineering",        # exact name from departments table
    "designation_name": "Software Engineer", # job title
    "date_of_joining": "2023-06-01",         # YYYY-MM-DD format
    "reporting_manager_emp_code": "GTPL005", # manager's emp code
    "role": "employee",                      # employee / manager / hr_admin
},
```
4. Run: `python -m app.scripts.update_employee_details`

---

## Day 2 â€” 17 March 2026

### Full Codebase Review

Before starting the next phase, performed a complete review of every file in the project.

#### Backend â€” What We Have (32 Python files)

| Layer | Files | What They Do |
|---|---|---|
| **Core** | `main.py`, `config.py`, `database.py` | FastAPI app, Pydantic settings (loaded from `.env`), async MySQL connection pool (SQLAlchemy 2.0 + aiomysql) |
| **Models** (6 files) | `employee.py`, `leave.py`, `attendance.py`, `salary.py`, `notification.py`, `base.py` | 15 tables â€” Employee (50+ columns inc. PII, family, compliance), Department, Designation, LeaveType, LeaveBalance, LeaveRequest, Holiday, AttendanceLog, Shift, ShiftAssignment, GeofenceZone, SalaryLevel, SalaryComponent, DeviceToken, Notification |
| **Routers** (5 files) | `auth.py`, `employees.py`, `leaves.py`, `attendance.py`, `notifications.py` | 35 REST endpoints â€” login/refresh/change-password, CRUD employees, apply/approve/cancel leave, punch-in/out with GPS, notification bell |
| **Schemas** (5 files) | `common.py`, `auth.py`, `employee.py`, `leave.py`, `attendance.py` | Pydantic request/response models â€” standard `{success, message, data}` envelope, paginated responses |
| **Services** (1 file) | `leave_service.py` | Leave Decision Engine â€” balance check â†’ notice check â†’ probation check â†’ auto-approve/send-to-manager/reject |
| **Middleware** (1 file) | `auth.py` | JWT bearer token guard, RBAC role factories (`require_hr`, `require_manager`, `require_admin`) |
| **Utils** (1 file) | `security.py` | bcrypt hashing, JWT create/decode (python-jose) |
| **Scripts** (2 files) | `seed_gadiel.py`, `update_employee_details.py` | One-time seeding of 13 employees, 6 salary levels, 7 leave types, 7 departments, 1 shift, 10 holidays; employee personal data update pipeline |

#### Key Design Decisions Confirmed

- **Async everywhere** â€” all DB operations use `async/await` via `aiomysql`
- **UUID primary keys** stored as `String(36)` â€” portable across MySQL/PostgreSQL
- **Haversine distance** calc for geofence validation (in `attendance.py` router)
- **Leave engine** auto-calculates business days (skips Sundays + Indian public holidays)
- **Balance accounting** â€” pending/used/adjusted tracked separately in `leave_balances`
- **RBAC** â€” 4 roles: `super_admin`, `hr_admin`, `manager`, `employee`
- **CORS** â€” wide open in dev (`*`), needs locking for production

#### Files Outside Backend

| File | Status |
|---|---|
| `docker-compose.yml` | API + worker (Celery) + Redis. MySQL runs locally. |
| `requirements.txt` | 19 dependencies pinned â€” FastAPI, SQLAlchemy, aiomysql, Alembic, bcrypt 4.0.1, etc. |
| `HRMS_README.MD` | Full product vision doc â€” 1,157 lines covering architecture, modules, multi-tenant design, deployment |
| `frontend/` | **Empty** â€” not started |
| `mobile/` | **Empty** â€” not started |

#### Still Pending From Gadiel (unchanged from Day 1)

- [ ] Department assignment per employee
- [ ] Designation / job title per employee
- [ ] Date of joining per employee
- [ ] Reporting manager hierarchy
- [ ] Office GPS coordinates
- [ ] Custom holiday calendar
- [ ] Leave balance initialization for 2025-26

---

### What We're Building Next â€” Phase 2: React Web Frontend

The backend API is complete and tested. Now we build the **HR admin web dashboard** â€” the first UI that Gadiel's HR team (Monika, managers) will use daily.

#### Tech Stack for Frontend

```
Framework       : Vite + React 18 + TypeScript
Styling         : Tailwind CSS 4 + shadcn/ui components
State           : React Query (TanStack Query) for API calls
Routing         : React Router v6
Charts          : Recharts
Auth            : JWT tokens stored in httpOnly cookies / localStorage
Build           : Vite (dev server + production build)
```

#### Pages to Build (in order)

| # | Page | Priority | Description |
|---|---|---|---|
| 1 | **Login** | P0 | Email + password â†’ JWT tokens â†’ redirect to dashboard |
| 2 | **HR Dashboard** | P0 | Attendance overview, leave summary, headcount cards, quick stats |
| 3 | **Employee Directory** | P0 | Searchable / filterable table of all employees with profile view |
| 4 | **Employee Profile** | P0 | Full detail view â€” personal, org, leave balance, attendance history |
| 5 | **Leave Management** | P0 | Apply leave (self), view team leaves, approve/reject (manager/HR) |
| 6 | **Attendance View** | P1 | Calendar view + daily log, punch-in/out times, summary stats |
| 7 | **Notifications** | P1 | Bell icon, unread count, mark-read |

#### API Endpoints the Frontend Will Consume

All 35 existing endpoints, primarily:
- `POST /api/v1/auth/login` â€” Login
- `GET /api/v1/auth/me` â€” Get logged-in user
- `GET /api/v1/employees` â€” List employees (HR/Manager)
- `GET /api/v1/employees/{id}` â€” Employee detail
- `GET /api/v1/leaves/balance` â€” Leave balances
- `POST /api/v1/leaves/apply` â€” Apply for leave
- `GET /api/v1/leaves/team` â€” Team leaves (Manager view)
- `PATCH /api/v1/leaves/{id}/action` â€” Approve/Reject
- `GET /api/v1/attendance/today` â€” Today's status
- `GET /api/v1/attendance/summary/{id}` â€” Monthly summary
- `GET /api/v1/notifications` â€” Notification list

---

### Current Project Status (Day 2)

| Component | Status |
|---|---|
| Backend API (FastAPI) | âœ… Complete â€” 35 endpoints, all tested |
| Database (MySQL) | âœ… 15 tables, 13 employees + all reference data seeded |
| Employee personal data | âœ… Complete for all 13 |
| Employee org data | â³ Pending â€” need dept/designation/DOJ/manager from Gadiel |
| Leave policy rules | âœ… Encoded in leave engine |
| Auth (JWT + RBAC) | âœ… Working â€” 4 roles, tested |
| React web frontend | ðŸ”¨ **Starting now** |
| React Native mobile app | â¬œ Not started |
| AI HR assistant | â¬œ Not started |

---

*Log updated: 17 March 2026*

---

## Day 3 â€” 21 March 2026

### What We Built â€” Phase 2: React Web Frontend

The complete React web frontend is now scaffolded and ready to run. This is a **mobile-first responsive web app** â€” designed for phone screens first, expanding beautifully to desktop.

---

#### Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Vite | ^6.0.5 | Build tool + dev server (port 3000) |
| React | ^18.3.1 | UI framework |
| TypeScript | ^5.6.3 | Type safety across all files |
| Tailwind CSS | ^3.4.17 | Utility-first styling |
| shadcn/ui | (manual) | Pre-built component library (Radix UI) |
| TanStack Query | ^5.62.2 | Server state + caching |
| React Router | ^6.28.0 | Client-side routing |
| Zustand | ^5.0.2 | Auth state management (persisted) |
| Axios | ^1.7.9 | HTTP client with JWT interceptor |
| Sonner | ^1.7.1 | Toast notifications |
| lucide-react | ^0.468.0 | Icons |
| date-fns | ^4.1.0 | Date formatting |

---

#### File Structure Created

```
frontend/
â”œâ”€â”€ index.html                    â† Entry HTML
â”œâ”€â”€ package.json                  â† Dependencies (54 packages)
â”œâ”€â”€ vite.config.ts                â† Vite build + proxy to :8000
â”œâ”€â”€ tsconfig.json                 â† TypeScript config (@/* alias)
â”œâ”€â”€ tailwind.config.ts            â† Tailwind + shadcn/ui CSS vars
â”œâ”€â”€ postcss.config.js             â† PostCSS for Tailwind
â””â”€â”€ src/
    â”œâ”€â”€ main.tsx                  â† React root mount
    â”œâ”€â”€ App.tsx                   â† Router + QueryClient + Toaster
    â”œâ”€â”€ index.css                 â† Tailwind base + CSS variables (indigo theme)
    â”œâ”€â”€ types/index.ts            â† All TypeScript interfaces (Employee, Leave, Attendance...)
    â”œâ”€â”€ api/
    â”‚   â”œâ”€â”€ client.ts             â† Axios instance + JWT interceptor + auto-refresh
    â”‚   â”œâ”€â”€ auth.ts               â† login, me, changePassword, refresh
    â”‚   â”œâ”€â”€ employees.ts          â† list, get, create, update, deactivate, departments
    â”‚   â”œâ”€â”€ leaves.ts             â† types, balance, apply, myLeaves, teamLeaves, action
    â”‚   â”œâ”€â”€ attendance.ts         â† today, my, summary, punchIn, punchOut, correct
    â”‚   â””â”€â”€ notifications.ts      â† list, markRead, markAllRead
    â”œâ”€â”€ store/auth.ts             â† Zustand store (employee + isAuthenticated, persisted)
    â”œâ”€â”€ lib/utils.ts              â† cn(), formatDate(), formatTime(), getInitials()...
    â”œâ”€â”€ components/
    â”‚   â”œâ”€â”€ ui/                   â† shadcn/ui components
    â”‚   â”‚   â”œâ”€â”€ button.tsx        â† Button (variant + size CVA)
    â”‚   â”‚   â”œâ”€â”€ input.tsx         â† Input
    â”‚   â”‚   â”œâ”€â”€ label.tsx         â† Label (Radix)
    â”‚   â”‚   â”œâ”€â”€ card.tsx          â† Card, CardHeader, CardTitle, CardContent, CardFooter
    â”‚   â”‚   â”œâ”€â”€ badge.tsx         â† Badge (success/warning/destructive/info/muted variants)
    â”‚   â”‚   â”œâ”€â”€ avatar.tsx        â† Avatar, AvatarImage, AvatarFallback
    â”‚   â”‚   â”œâ”€â”€ dialog.tsx        â† Dialog (modal)
    â”‚   â”‚   â”œâ”€â”€ sheet.tsx         â† Sheet (slide-in panel, used for mobile nav drawer)
    â”‚   â”‚   â”œâ”€â”€ dropdown-menu.tsx â† Dropdown menu
    â”‚   â”‚   â”œâ”€â”€ select.tsx        â† Select with Radix
    â”‚   â”‚   â”œâ”€â”€ tabs.tsx          â† Tabs, TabsList, TabsTrigger, TabsContent
    â”‚   â”‚   â”œâ”€â”€ textarea.tsx      â† Textarea
    â”‚   â”‚   â”œâ”€â”€ skeleton.tsx      â† Loading skeleton
    â”‚   â”‚   â”œâ”€â”€ separator.tsx     â† Divider
    â”‚   â”‚   â”œâ”€â”€ progress.tsx      â† Progress bar (Radix)
    â”‚   â”‚   â””â”€â”€ sonner.tsx        â† Toast toaster (Sonner)
    â”‚   â”œâ”€â”€ layout/
    â”‚   â”‚   â”œâ”€â”€ AppLayout.tsx     â† Auth guard + Sidebar + Header + main + BottomNav
    â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx       â† Desktop left nav (hidden on mobile)
    â”‚   â”‚   â”œâ”€â”€ Header.tsx        â† Top bar (mobile menu, bell, user avatar menu)
    â”‚   â”‚   â””â”€â”€ BottomNav.tsx     â† Mobile bottom tab bar (hidden on desktop)
    â”‚   â””â”€â”€ shared/
    â”‚       â”œâ”€â”€ StatCard.tsx      â† Dashboard stat card with icon + color variants
    â”‚       â””â”€â”€ EmptyState.tsx    â† Empty list placeholder
    â””â”€â”€ pages/
        â”œâ”€â”€ auth/LoginPage.tsx           â† Login form (email/password, JWT storage)
        â”œâ”€â”€ dashboard/DashboardPage.tsx  â† Home (today's status, leave balances, pending approvals)
        â”œâ”€â”€ employees/
        â”‚   â”œâ”€â”€ EmployeesPage.tsx        â† Employee list (search, dept filter, pagination)
        â”‚   â””â”€â”€ EmployeeDetailPage.tsx   â† Employee detail (tabs: Overview, Leaves, Attendance)
        â”œâ”€â”€ leaves/LeavesPage.tsx        â† Leave balances, apply form, my history, team approvals
        â”œâ”€â”€ attendance/AttendancePage.tsxâ† Monthly log, summary stats, daily punch times
        â””â”€â”€ notifications/NotificationsPage.tsx â† Bell list with mark-read
```

---

#### Mobile-First Design Decisions

| Feature | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar (BottomNav) | Left sidebar (Sidebar) |
| Employee list | Card-based (stacked) | Same cards, more info shown |
| Filters | Horizontal scroll | Inline |
| Dialogs | Full-width (mx-4) | Centered modal |
| Leave apply | Dialog/modal | Same |
| Stats | 2-col grid | 4-col grid |
| Content padding | 16px | 24px |

Key Tailwind responsive prefix used: `lg:` (â‰¥1024px = desktop mode)

---

#### Auth Flow

```
Login Page
  â†’ POST /api/v1/auth/login
  â†’ Tokens stored in localStorage (access_token, refresh_token)
  â†’ GET /api/v1/auth/me â†’ stored in Zustand (persisted via localStorage)
  â†’ Redirect to /

Axios Interceptor (api/client.ts):
  â†’ Attaches Bearer token to all requests
  â†’ On 401: tries refresh â†’ if fails, clears tokens + redirects to /login

Zustand persist middleware:
  â†’ employee + isAuthenticated survives page refresh
  â†’ logout() clears both Zustand + localStorage
```

---

#### Pages Built

| Page | Route | Who Sees It | Key Features |
|---|---|---|---|
| Login | /login | Everyone | Email/password, show/hide pwd, error display |
| Dashboard | / | All roles | Today's attendance status, leave balance grid, pending approvals (manager/HR) |
| Employees | /employees | Manager / HR | Search, dept filter, paginated card list |
| Employee Detail | /employees/:id | Role-scoped | Profile tabs: Overview / Leave Balance / Attendance Summary |
| Leaves | /leaves | All | Balance cards with progress bars, apply dialog, my history, team approval (manager/HR) |
| Attendance | /attendance | All | Month navigation, summary stats, daily punch-in/out log |
| Notifications | /notifications | All | Bell list, mark read, mark all read, time-ago display |

---

#### What Still Needs to Be Done

- [ ] **Install Node.js** â€” needed to run `npm install` and start the dev server (see below)
- [ ] Profile page â€” view/edit own personal info
- [ ] Add Employee form (HR admin)
- [ ] Attendance punch-in/out on web (GPS button)
- [ ] Phase 3: React Native mobile app (Expo)
- [ ] Phase 4: AI HR assistant (Claude API)

---

### How to Run the Frontend

**Step 1: Install Node.js** (if not already installed)
Download from: https://nodejs.org/en/download (LTS version)

**Step 2: Install dependencies**
```bash
cd C:/Users/utkku/OneDrive/Desktop/my_products/HRMS/frontend
npm install
```

**Step 3: Start dev server**
```bash
npm run dev
# Opens at: http://localhost:3000
```

**Step 4: Make sure backend is running** (in a separate terminal)
```bash
cd C:/Users/utkku/OneDrive/Desktop/my_products/HRMS/backend
python -m uvicorn app.main:app --reload
# API at: http://localhost:8000
```

**Step 5: Log in**
- URL: http://localhost:3000
- Email: `karthik.pandian@gadieltech.com`
- Password: `Gadiel@2025`

---

### Current Project Status (Day 3)

| Component | Status |
|---|---|
| Backend API (FastAPI) | Complete â€” 35 endpoints |
| Database (MySQL) | 15 tables, 13 employees seeded |
| React web frontend | **Built â€” needs Node.js + npm install** |
| React Native mobile app | Not started (Step 3) |
| AI HR assistant | Not started (Step 4) |

---

*Log updated: 21 March 2026*

---

## Day 4 â€” 21 March 2026 (Session 2)

### What We Did â€” Full UI Redesign + Application Completion

Two major things happened today: a complete visual redesign of the web app to match a premium HRMS reference design, and finishing all missing pages/features to make the application fully functional.

---

#### 1. Full UI Redesign â€” Premium Green Theme

The entire application was redesigned from scratch to match a polished, production-grade HRMS style. Every component, page, and layout was rewritten.

**Design system changes:**

| Token | Before | After |
|---|---|---|
| Primary color | Indigo `238 75% 55%` | Emerald green `142 72% 37%` |
| Background | White | Slate `210 20% 97%` |
| Card style | `rounded-xl border` | `rounded-2xl border border-slate-100 shadow-card` |
| Border radius | `0.5rem` | `0.75rem` (+ xl, 2xl tokens) |
| Sidebar width | 264px (text + icon) | 72px (icon-only with CSS tooltips) |
| Status badges | shadcn `<Badge variant>` | Inline color pill classes |

**New shared components:**

- **`RingChart.tsx`** â€” Custom SVG donut/ring progress chart. No external chart dependency. Used on Dashboard and Attendance pages to show monthly attendance percentage.
- **`EmptyState.tsx`** â€” Refined with `rounded-2xl` icon box, slate-50 background

**CSS additions in `index.css`:**

```css
.nav-item:hover .nav-tooltip { opacity: 1; translate: 0 }
/* CSS-only hover tooltips for icon-only sidebar */
```

---

#### 2. Layout Redesign

| Component | Change |
|---|---|
| `Sidebar.tsx` | 72px icon-only sidebar, CSS tooltips on hover, notification badge on bell icon |
| `Header.tsx` | Added date/time chip, premium avatar dropdown, page title derived from URL |
| `AppLayout.tsx` | `h-screen overflow-hidden`, `page-enter` fade-up animation wrapper |
| `BottomNav.tsx` | `bg-primary/10` pill indicator for active tab, safe-area-inset padding for iPhones |

---

#### 3. All Pages Redesigned

Every page was rewritten to use the new design system:

| Page | Key Changes |
|---|---|
| `LoginPage` | Split-panel: left = green branded panel with stats grid; right = login form |
| `DashboardPage` | RingChart for monthly %, leave balance mini bars, pending approvals list |
| `EmployeesPage` | White card with dividers, custom search input, pill status badges |
| `EmployeeDetailPage` | Colored role/status chips, RingChart on attendance tab, clean info rows |
| `LeavesPage` | 4-col balance cards with colored dots + mini bars, inline approve/reject |
| `AttendancePage` | RingChart + 6-stat grid, clean daily log with status chips |
| `NotificationsPage` | Lucide icon per notification type with colored backgrounds |

---

#### 4. New Pages Built

**`ProfilePage`** (`/profile`)
- Own profile view with 3 tabs: Work, Personal, Security
- Work tab: org details (dept, designation, employment type, DOJ, work location)
- Personal tab: personal details, address, emergency contact
- Security tab: change password form with current/new/confirm fields, show/hide toggles, error display

**`EmployeeFormPage`** (`/employees/new` and `/employees/:id/edit`)
- Single form component handles both create and edit (detects via URL `:id` param)
- 4 sections: Basic Information, Employment Details, Personal Details, Emergency Contact
- All fields: name, email, phone, gender, role, department, designation, employment type/status, DOJ, DOB, work location, blood group, marital status, emergency contact
- Edit mode pre-fills all fields from existing employee data
- Email field disabled in edit mode
- Cleans empty strings before sending to API

---

#### 5. Punch In / Out â€” Core Attendance Feature

Added directly to the Dashboard page header area. Shows a prominent button at the top right:

- **Green "Punch In" button** â€” when employee hasn't punched in yet today
- **Red "Punch Out" button** â€” when punched in but not out
- **"Day completed" chip** â€” when both punches are done
- Requests browser geolocation on click (5s timeout, graceful fallback to 0,0 if denied)
- Invalidates `attendance-today` and `attendance-summary` queries on success

---

#### 6. Employee Edit Button

Added Edit button (HR/Admin only) to the top of `EmployeeDetailPage`, visible only to `hr_admin` and `super_admin` roles. Routes to `/employees/:id/edit` which loads the EmployeeFormPage pre-filled.

---

#### 7. App.tsx â€” All Routes Wired

Final route table:

| Route | Component | Description |
|---|---|---|
| `/login` | LoginPage | Public |
| `/` | DashboardPage | Punch in/out, stats, approvals |
| `/employees` | EmployeesPage | List with search/filter |
| `/employees/new` | EmployeeFormPage | Create employee |
| `/employees/:id` | EmployeeDetailPage | View profile |
| `/employees/:id/edit` | EmployeeFormPage | Edit employee |
| `/leaves` | LeavesPage | Leave management |
| `/attendance` | AttendancePage | Attendance log |
| `/notifications` | NotificationsPage | Bell notifications |
| `/profile` | ProfilePage | Own profile + change password |

---

### Build Status

```
npm run build â€” âœ… Zero TypeScript errors
Bundle: 557KB (JS) + 41KB (CSS) â€” production ready
```

---

### Current Project Status (Day 4)

| Component | Status |
|---|---|
| Backend API (FastAPI) | âœ… Complete â€” 35 endpoints |
| Database (MySQL) | âœ… 15 tables, 13 employees seeded |
| React web frontend | âœ… **Fully complete â€” all pages, all features** |
| React Native mobile app | â¬œ Not started (Step 3) |
| AI HR assistant | â¬œ Not started (Step 4) |

---

### How to Run

```bash
# Terminal 1 â€” Backend
cd C:/Users/utkku/OneDrive/Desktop/my_products/HRMS/backend
python -m uvicorn app.main:app --reload

# Terminal 2 â€” Frontend
cd C:/Users/utkku/OneDrive/Desktop/my_products/HRMS/frontend
npm run dev
# Open: http://localhost:3000
# Login: karthik.pandian@gadieltech.com / Gadiel@2025
```

---

*Log updated: 21 March 2026*

---

## Day 5 â€” 22 March 2026

### What We Did â€” Blue Theme Redesign + Mobile Sign-Up Flow + Welcome Page Bug Fix

---

#### 1. Full UI Redesign â€” Blue Theme (Web + Mobile)

Replaced the emerald green theme with a blue theme across the entire application â€” both web and mobile.

**Web (`frontend/src/index.css`):**

| Token | Before | After |
|---|---|---|
| `--primary` | `142 72% 37%` (emerald) | `217 91% 60%` (#3B82F6 blue-500) |
| `--secondary` | Green tints | `214 60% 93%` (light blue tint) |
| `--ring` | Green | `217 91% 60%` (blue) |

**Mobile:** All `GREEN = '#...'` constants in every screen file changed to `BLUE = '#3B82F6'`.

---

#### 2. Login Page Redesign â€” Matches Reference Image

`frontend/src/pages/auth/LoginPage.tsx` completely redesigned:

- **Background:** Light blue (`#C8E2F5`) full-page
- **Top-left:** `GadielLogo` SVG component + "UT-HRMS" text
- **Left panel (desktop only):** "Gadiel Technologies PVT. LTD." heading + company about paragraph
- **Right panel:** White rounded card â€” clean email + password form
- **Removed:** "Productivity" chart section that was inside the form card
- **Labels:** Changed "Work Email" â†’ "Email" everywhere
- **Footer:** Changed to "Powered by UT-HRMS"

---

#### 3. New GadielLogo SVG Component

Created `frontend/src/components/shared/GadielLogo.tsx` â€” an SVG approximation of the Gadiel brand mark:
- Dark navy (`#1A2E70`) square background with rounded corners
- White geometric "G" letter shape (three horizontal bars)
- Teal (`#00C8E8`) curved arc on the right side

Used in: `LoginPage` (top-left), `Sidebar`, `Header` (replacing the Building2 icon).

---

#### 4. Sidebar + Header Branding Update

- `Sidebar.tsx`: Building2 icon replaced with `<GadielLogo size={38} />`
- `Header.tsx`: Building2 replaced with `<GadielLogo size={28} />`, "Gadiel" text â†’ "UT-HRMS", mobile drawer updated to match

---

#### 5. Mobile Sign-Up Flow Screens

Four mobile screens built for the complete auth flow:

| Screen | Stack Route | Description |
|---|---|---|
| `LoginScreen` | `Login` | Email + password â†’ JWT â†’ `/auth/me` â†’ Welcome |
| `EmailVerifyScreen` | `EmailVerify` | Enter email â†’ API check â†’ route to SetupPassword or Login |
| `SetupPasswordScreen` | `SetupPassword` | Create + confirm password â†’ activate account â†’ Welcome |
| `WelcomeScreen` | `Welcome` | Animated welcome â†’ auto-redirect to Home after 4s |

All screens use blue theme (`BLUE = '#3B82F6'`), navy Gadiel logo box (`NAVY = '#1A2E70'`), "UT-HRMS" branding.

New backend endpoints consumed by mobile:
- `POST /api/v1/auth/verify-email` â€” checks email exists, returns `{first_name, has_password}`
- `POST /api/v1/auth/setup-password` â€” sets password when null, returns JWT tokens

---

#### 6. Welcome Page Flow (Web + Mobile)

After successful sign-in **or** sign-up, both web and mobile always show a Welcome page before routing to the app.

**Web (`WelcomePage.tsx`):**
- Full-screen blue background with decorative concentric rings
- Inline SVG checkmark in layered circles
- Layout: "WELCOME TO" â†’ "Gadiel Technologies" â†’ divider â†’ user's first name â†’ subtitle
- Progress bar counting down 4 seconds â†’ auto-redirects to `/`
- "Continue to App" button for instant skip

**Mobile (`WelcomeScreen.tsx`):**
- Same visual concept in React Native using `Animated` API (spring scale + fade-in + slide-up)
- Auto-redirects to `Home` after 4 seconds
- "Continue to App" â†’ `navigation.replace('Home')`

---

#### 7. Bug Fix â€” Welcome Page Not Appearing After Login/Sign-Up (Web)

**Root cause:** Zustand's `useSyncExternalStore` fires synchronously. When `setEmployee(me)` was called before `navigate('/welcome', ...)`, it set `isAuthenticated: true` immediately, causing `PublicRoute` on `/login` to render `<Navigate to="/" replace />` â€” overriding the subsequent navigate call.

**Fix in `frontend/src/pages/auth/LoginPage.tsx`** â€” swap the call order in both `handleSignIn` and `handleSetupPassword`:

```ts
// Before (buggy)
setEmployee(me)
navigate(`/welcome?name=...`, { replace: true })

// After (fixed)
navigate(`/welcome?name=...`, { replace: true })
setEmployee(me)
```

Why it works: `/welcome` has no `PublicRoute` wrapper. By the time `setEmployee` fires (setting `isAuthenticated: true`), the active route is already `/welcome` â€” nothing redirects. When WelcomePage auto-navigates to `/` after 4s, `isAuthenticated` is true so `AppLayout` passes the check.

---

### Current Project Status (Day 5)

| Component | Status |
|---|---|
| Backend API (FastAPI) | âœ… Complete â€” 37 endpoints (incl. verify-email, setup-password) |
| Database (MySQL) | âœ… 15 tables, 13 employees seeded |
| React web frontend | âœ… Complete â€” blue theme, all pages, welcome page flow working |
| Mobile â€” auth flow | âœ… EmailVerify â†’ SetupPassword â†’ Welcome â†’ Home |
| Mobile â€” Login screen | âœ… Built |
| Mobile â€” Home/Dashboard | â¬œ Next to build |
| AI HR assistant | â¬œ Not started (Step 4) |

---

*Log updated: 22 March 2026*

---

## Day 6 â€” 23 March 2026

### What We Did â€” Blue Theme Rollout, Logo Fix, UX Polish, Dashboard Redesign, Mobile Home Screen

---

#### 1. Full Blue Theme Rollout â€” Web

Applied the login page's light blue aesthetic across the entire web app.

**`frontend/src/index.css` â€” CSS variable changes:**

| Token | Before | After |
|---|---|---|
| `--background` | `210 20% 97%` (near-white gray) | `205 69% 87%` (#C8E2F5, matching login page) |
| `--secondary` | Neutral tint | `205 50% 92%` (blue tint) |
| `--muted` | Neutral | `205 40% 91%` |
| `--accent` | Neutral | `205 40% 91%` |
| `--border` | Neutral | `205 40% 82%` |
| `--input` | Neutral | `205 40% 82%` |

The entire app background now matches the login page â€” a consistent light blue (#C8E2F5) canvas everywhere.

---

#### 2. Sidebar Redesigned â€” Navy Theme

`frontend/src/components/layout/Sidebar.tsx` changed from white to navy:

- Background: `#1A2E70` (same navy as the GadielLogo box) with a subtle right-side shadow
- Active nav item: `bg-white/20 text-white`
- Inactive nav item: `text-white/50 hover:bg-white/10 hover:text-white`
- Bottom section: avatar button (click â†’ `/profile`), removed sign-out button entirely
- Desktop sidebar now visually unifies the Gadiel brand mark with the navigation

---

#### 3. Header Cleaned Up

`frontend/src/components/layout/Header.tsx`:

- Changed from `bg-white/95 backdrop-blur` to clean `bg-white`
- Date chip updated to blue tint: `bg-blue-50 border-blue-100`
- Mobile slide-in drawer background changed to `#1A2E70` (matching sidebar), all text white
- Sign-out button stays in mobile drawer only (removed from desktop sidebar)

---

#### 4. GadielLogo SVG Fix

`frontend/src/components/shared/GadielLogo.tsx` â€” full SVG rewrite to match the actual brand reference image provided by the user.

Key corrections made:

| Element | Before | After |
|---|---|---|
| Middle shelf (G) | `x=22` (right side only â€” wrong) | `x=7` (left-anchored â€” correct G letterform) |
| Teal arc | `strokeWidth="3.5"` (thin) | `strokeWidth="6"` (bold, matches reference) |
| Arc path | Existed | Unchanged path `M24 12 Q38 20 24 28` |

The G letterform now correctly has: left vertical bar â†’ top bar â†’ bottom bar â†’ middle shelf (protruding inward from left), with the bold teal arc curving out to the right.

---

#### 5. Sidebar UX â€” Avatar Navigates to Profile

Removed the separate sign-out button from the desktop sidebar bottom. The bottom avatar button now navigates to `/profile` on click. Sign-out is accessible from the profile dropdown in the Header.

```tsx
// Sidebar bottom â€” before: LogOut icon button
// Sidebar bottom â€” after: Avatar button â†’ navigate('/profile')
<button onClick={() => navigate('/profile')} className="...">
  <Avatar>...</Avatar>
  <span className="nav-tooltip">{employee.full_name}</span>
</button>
```

---

#### 6. Security Tab Restriction â€” ProfilePage

`frontend/src/pages/profile/ProfilePage.tsx`:

The Security tab (change password) is now only visible to three specific users:

```ts
const SECURITY_TAB_ALLOWED = ['Vishal Mantoo', 'Namrata Dudha', 'Utkarsh Jha']
const canViewSecurity = SECURITY_TAB_ALLOWED.includes(emp?.full_name ?? '')
```

Both the `TabsTrigger` and `TabsContent` for the Security tab are conditionally rendered based on this check. All other employees see only Work and Personal tabs.

---

#### 7. Dashboard Redesigned â€” 2-Column Layout

`frontend/src/pages/dashboard/DashboardPage.tsx` fully redesigned to match a provided reference screenshot.

**Layout:**

```
[ Greeting + Punch Button ]

[ Left col â€” 3/5 width ]         [ Right col â€” 2/5 width ]
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Pending Actions        â”‚       â”‚  My Team            â”‚
  â”‚  (managers/HR only)     â”‚       â”‚  (managers/HR only) â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Today's Status         â”‚       â”‚  Leave Balance      â”‚
  â”‚  RingChart + stats      â”‚       â”‚  EL / SL / CL bars  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key changes from old layout:**
- Removed: StatCard row (headcount, present, on-leave, etc. as top cards)
- Added: `actionsExpanded` state â€” Pending Actions section is collapsible (ChevronUp button)
- Added: `teamData` query + My Team avatar grid (4Ã—2, click more â†’ `/employees`)
- Punch button: green `LogIn` icon + `"+ Punch In"` label; red `LogOut` for punch-out
- Stats row: colored rounded boxes (`bg-emerald-50`, `bg-red-50`, `bg-amber-50`, `bg-blue-50`)
- CSS grid: `grid-cols-1 lg:grid-cols-5` with `lg:col-span-3` / `lg:col-span-2`

---

#### 8. Mobile HomeScreen Built

`mobile/src/screens/HomeScreen.tsx` â€” new screen built from scratch.

**Structure:**

```
NavBar       Navy (#1A2E70) header â€” greeting, date, avatar (tap â†’ sign out)
             Punch In / Punch Out button (green/red)

ScrollView   #F0F7FD background

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Today's Attendance              â”‚
  â”‚  Custom ring (View-based)        â”‚
  â”‚  Punch in / out times            â”‚
  â”‚  Present | Absent | Late | Leave â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Leave Balance                   â”‚
  â”‚  EL Â· SL Â· CL with progress bars â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Quick Links                     â”‚
  â”‚  Leaves  Attendance  Profile     â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Technical details:**
- Ring chart implemented using `View` + 4-sided border colors (no SVG library needed)
- Pull-to-refresh via `RefreshControl`
- Loading state shows a navy loading screen while data is fetched
- Auth failure (401) â†’ automatic redirect to `Login` screen
- `loadData()` uses `Promise.all` for parallel API calls

---

#### 9. Mobile API Client Extended

`mobile/src/api/client.ts` additions:

- Added Axios request interceptor to auto-attach stored JWT token to all requests
- New endpoints: `getMe()`, `getTodayAttendance()`, `punchIn()`, `punchOut()`, `getAttendanceSummary()`, `getLeaveBalance()`

---

#### 10. App.tsx Updated

`mobile/App.tsx`:

- Replaced inline `HomePlaceholder` function with real `HomeScreen` import
- Removed placeholder `StyleSheet` and component

---

### Current Project Status (Day 6)

| Component | Status |
|---|---|
| Backend API (FastAPI) | âœ… Complete â€” 37 endpoints |
| Database (MySQL) | âœ… 15 tables, 13 employees seeded |
| React web frontend | âœ… Complete â€” blue theme everywhere, dashboard redesigned |
| Mobile â€” auth flow | âœ… EmailVerify â†’ SetupPassword â†’ Welcome â†’ Home |
| Mobile â€” Home/Dashboard | âœ… Built â€” attendance, leave balance, punch in/out |
| Mobile â€” additional screens | â¬œ Leaves, Attendance, Profile pages |
| AI HR assistant | â¬œ Not started (Step 4) |

---

*Log updated: 23 March 2026*

---

## Day 7 â€” 24 March 2026

### What We Did

#### 1. Full UI Redesign â€” 4 Pages Rebuilt from Screenshots

Four pages were completely rewritten to match a new reference design, replacing the old tab-based layout with more information-dense, visually structured pages.

**ProfilePage** (`frontend/src/pages/profile/ProfilePage.tsx`)

```
[ Breadcrumb: Dashboard ]

[ Left: Profile Card  ]  [ Right: Accordion Sections ]
  Silhouette avatar         Personal Info (2-col grid)
  Name + role badge         Work Info
  Direct Message button     Emergency Contact
  Email / phone             Bank Details
                            Security (restricted)
```

- Replaced tab navigation with collapsible `<Section>` accordion components
- Custom silhouette SVG avatar with initials badge (no external image dependency)
- Security section restricted to a hardcoded `SECURITY_TAB_ALLOWED` list (privacy)
- `InfoCell` helper renders label + value pairs in a 2-column grid

---

**AttendancePage** (`frontend/src/pages/attendance/AttendancePage.tsx`)

```
[ Header ]

[ Ring Chart ]  [ Calendar Grid ]  [ Stats + Daily Log ]
  Attendance %    Month navigator    6 stat boxes (3x2)
  Legend          Color-coded dots   Collapsible log list
```

- `buildCalendarCells(year, month)` â€” builds `(number | null)[]` grid with Sunday-offset padding
- Today highlighted in navy (`#1A2E70`); each date cell shows a colored status dot
- 6 stat boxes: Present, Absent, Late, Half Day, On Leave, WFH â€” each with colored icon
- Daily Log is collapsible (ChevronUp/Down toggle), scrollable, shows punch-in/out times

---

**LeavesPage** (`frontend/src/pages/leaves/LeavesPage.tsx`)

```
[ Header + Apply Leave button ]

[ EL card ]  [ SL card ]  [ CL card ]  [ Other card ]

[ Full-month leave calendar ]

[ Leave Records (mine) ]  [ Pending Approvals (HR) ]
```

- 4 balance cards with colored icons and `used / total` fraction
- Calendar highlights leave days in light blue using `leaveSet` (Set of date strings)
- Apply Leave dialog retained; Reject dialog with reason input retained
- Bottom 2-col grid: my records list (expandable) + pending approvals with approve/reject

---

**NotificationsPage** (`frontend/src/pages/notifications/NotificationsPage.tsx`)

```
[ Header + Archive All button ]

[ Actions count ]  [ Alerts count ]  [ Approvals count ]

[ System Timeline â€” horizontal 5-event bar ]

[ System Logs (My/All tabs) ]  [ Notifications Feed (My/All tabs) ]
```

- 3 stat cards derived from notification type filtering
- Static `TIMELINE_EVENTS` horizontal timeline with connecting `h-px bg-slate-200` line
- Dual toggle tabs in both columns: My Logs / All Logs, My Feed / All Feed
- Mark-as-read on click; Archive All marks all read

---

#### 2. Production DB Init Script

`backend/app/scripts/init_production.py` â€” idempotent production data initialiser.

**What it does:**
- Creates `leave_balances` for all 13 employees Ã— 7 leave types = 91 rows (skips existing)
- Assigns the `General` shift to every employee via `shift_assignments`
- Creates an `Office` geofence zone (placeholder coordinates â€” to be updated with real GPS)
- Fully idempotent: safe to re-run without creating duplicates

**Leave balance bug fixed:**
The seed script had set both `total_entitled = 12` AND `accrued = 12` on the same row.
Since `available = total_entitled + carried_forward + accrued - used - pending`, employees were seeing `available = 24` instead of 12.
Fixed by running `UPDATE leave_balances SET accrued = 0` across all 91 rows.

---

#### 3. Per-Employee Geofence System â€” End-to-End

The attendance punch-in/out system previously validated location against all active geofence zones globally. This was replaced with a flexible per-employee model to support WFH employees, field employees, and client-site workers.

**Backend â€” Employee model** (`backend/app/models/employee.py`):
```python
geofence_zone_id: Mapped[Optional[str]] = mapped_column(
    String(36), ForeignKey("geofence_zones.id"), nullable=True
)
skip_location_check: Mapped[bool] = mapped_column(Boolean, default=False)
```

**Alembic migration** (`e4e1d66d8cea_employee_geofence_fields.py`):
- Adds `geofence_zone_id` column + FK constraint to `employees`
- Adds `skip_location_check` boolean column to `employees`
- Applied successfully with `alembic upgrade head`

**Three-tier geofence check logic** (`backend/app/routers/attendance.py`):

```python
async def check_geofence(lat, lng, employee, db) -> bool:
    # Tier 1: WFH / field employee â€” skip entirely
    if employee.skip_location_check:
        return True

    # Tier 2: Assigned to a specific zone â€” validate only against that zone
    if employee.geofence_zone_id:
        zone = await db.get(GeofenceZone, employee.geofence_zone_id)
        return haversine_distance(lat, lng, zone.lat, zone.lng) <= zone.radius

    # Tier 3: No zone assigned â€” validate against any active zone (default office)
    zones = await db.execute(select(GeofenceZone).where(is_active=True))
    return any(haversine_distance(...) <= z.radius for z in zones)
```

- WFH employees get `AttendanceStatus.wfh` (not `present`) on punch-in
- Punch response includes `"(WFH)"` or `"(outside geofence â€” flagged)"` suffix in message

**New Geofence CRUD endpoints** (HR/admin only):

| Method | Path | Description |
|---|---|---|
| `GET` | `/attendance/geofence-zones` | List all zones with employee count |
| `POST` | `/attendance/geofence-zones` | Create new zone |
| `PATCH` | `/attendance/geofence-zones/{id}` | Update zone (name/coords/radius/active) |
| `DELETE` | `/attendance/geofence-zones/{id}` | Delete zone + unassign all employees |

Delete endpoint automatically unassigns all employees (`geofence_zone_id = NULL`) before deletion.

**Backend schemas updated** (`backend/app/schemas/`):
- `GeofenceZoneCreate`, `GeofenceZoneUpdate`, `GeofenceZoneOut` added to `attendance.py`
- `EmployeeUpdate` and `EmployeeOut` extended with `geofence_zone_id` + `skip_location_check`

**Frontend â€” Types** (`frontend/src/types/index.ts`):
```typescript
export interface GeofenceZone {
  id: string; name: string
  latitude: number; longitude: number
  radius_meters: number; is_active: boolean
}
```

**Frontend â€” API** (`frontend/src/api/attendance.ts`):
```typescript
listZones, createZone, updateZone, deleteZone
```

**Frontend â€” EmployeeFormPage** (`frontend/src/pages/employees/EmployeeFormPage.tsx`):
- New "Attendance Location" section added to the create/edit employee form
- WFH toggle: clicking flips `skip_location_check` boolean with visual ON/OFF button
- Zone selector: `<Select>` dropdown showing all active zones; hidden when WFH is enabled
- Default option: "All active zones (default office)"

**Frontend â€” GeofencePage** (`frontend/src/pages/admin/GeofencePage.tsx`):
- HR-only admin page at `/geofence`
- Lists all zones in a table with: name, coordinates, radius, employee count, active status
- Expandable rows showing full detail + Google Maps link button
- Toggle active/inactive with `ToggleRight` / `ToggleLeft` icons
- Create Zone dialog + Edit Zone dialog sharing a common `ZoneForm` component
- Delete dialog with employee count warning before confirming deletion
- "How it works" explainer box describing the 3-tier logic for HR users

**Route + Nav wired up:**
- `App.tsx`: `<Route path="/geofence" element={<GeofencePage />} />`
- `Sidebar.tsx`: `MapPin` icon added, visible to `super_admin` and `hr_admin` only

---

### Bug Fixes

| Bug | Root Cause | Fix |
|---|---|---|
| `log.notes` TypeScript error | `AttendanceLog` type has `remarks`, not `notes` | Updated AttendancePage to use `log.remarks` |
| `and_` unused import lint warning | `and_` was imported but never used in attendance.py | Removed from import line |
| `current_employee` unused parameter (4x) | Geofence CRUD uses `Depends(require_hr)` for auth side-effect only | Renamed to `_` in all 4 functions |
| Leave balance showing 24 instead of 12 | Seed set `total_entitled=12` AND `accrued=12` â€” formula double-counted | `UPDATE leave_balances SET accrued=0` â€” 91 rows fixed |

---

### Current Project Status (Day 7)

| Component | Status |
|---|---|
| Backend API (FastAPI) | âœ… Complete â€” 41 endpoints (added geofence CRUD) |
| Database (MySQL) | âœ… 15 tables, 13 employees, leave balances fixed |
| React web frontend â€” core pages | âœ… All 9 pages complete with new design |
| React web frontend â€” geofence admin | âœ… GeofencePage with full CRUD |
| Mobile â€” auth flow | âœ… EmailVerify â†’ SetupPassword â†’ Welcome â†’ Home |
| Mobile â€” Home/Dashboard | âœ… Built â€” attendance, leave balance, punch in/out |
| Mobile â€” additional screens | â¬œ Leaves, Attendance, Profile pages |
| AI HR assistant | â¬œ Not started (Step 4) |

---

*Log updated: 24 March 2026*

