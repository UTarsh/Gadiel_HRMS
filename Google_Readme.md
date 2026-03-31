# Gadiel HRMS — Product Documentation

> **Last Updated:** 29 March 2026  
> **Version:** 1.0 Production  
> **Built by:** Gadiel Technologies Pvt. Ltd.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Roles & Permissions](#roles--permissions)
5. [Page-by-Page Guide](#page-by-page-guide)
   - [Login Page](#1-login-page)
   - [Dashboard](#2-dashboard)
   - [Attendance & Leaves](#3-attendance--leaves)
   - [Tasks](#4-tasks)
   - [Salary & Payslips](#5-salary--payslips)
   - [Monthly Report](#6-monthly-report)
   - [Geofence Zones](#7-geofence-zones)
   - [Profile](#8-profile)
   - [Notifications](#9-notifications)
   - [Employee Detail](#10-employee-detail)
6. [Database Synchronisation](#database-synchronisation)
7. [Design System](#design-system)

---

## Overview

Gadiel HRMS is a full-stack Human Resource Management System built for Gadiel Technologies. It handles employee attendance (with GPS geofencing), leave management, task delegation, salary/payroll, and organizational reporting — all through a premium, mobile-responsive web interface.

**Live Architecture:**
```
Frontend  →  React + Vite (port 3000)
Backend   →  FastAPI + SQLAlchemy (port 8001)
Database  →  MySQL (async via aiomysql)
Auth      →  JWT (access + refresh tokens)
```

---

## Tech Stack

| Layer        | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript                        |
| Styling     | Tailwind CSS + Custom CSS Variables ("Kinetic Culture") |
| State       | Zustand (auth), TanStack Query (server state)     |
| UI Library  | shadcn/ui (Dialog, Select, Avatar, Dropdown, etc) |
| Backend     | FastAPI, Python 3.11                              |
| ORM         | SQLAlchemy 2.0 (async)                            |
| Database    | MySQL 8.x                                         |
| Auth        | JWT (PyJWT), bcrypt password hashing              |
| File Upload | FastAPI UploadFile, local `uploads/` directory    |

---

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Default Login
- **Email format:** `firstname` + last initial + `@gadieltechnologies.com`  
  Example: `utkarshj@gadieltechnologies.com`
- **Default password:** `Gadiel@2025` (unless changed by the user)

---

## Roles & Permissions

The system has 4 roles defined in the `UserRole` enum:

| Role | Users | Summary |
|------|-------|---------|
| **`super_admin`** | Utkarsh Jha, Vishal Mantoo | Full unrestricted access to every feature |
| **`hr_admin`** | Namrata Dudha | Full HR access — payroll, reports, geofence, leave approvals |
| **`manager`** | Karthik Pandian, Akanksha Bhat, Shruti Sharma, Ashish Suri | Team management — approves leaves, assigns tasks to direct reports |
| **`employee`** | All other staff | Self-service — punch in/out, apply leave, view own salary/tasks |

### Special Named Access (Hardcoded)
In addition to role-based checks, the backend has name-based overrides:

| Person | Special Powers |
|--------|---------------|
| **Vishal** | Full task visibility + assign to anyone + payroll admin + monthly reports |
| **Namrata** | Full task visibility + assign to anyone + payroll admin + monthly reports |
| **Karthik** | Full task visibility (limited assignment to specific team members) |

---

## Page-by-Page Guide

### 1. Login Page

**Route:** `/login`  
**Access:** Public (unauthenticated users only)  
**DB Linked:** ✅ Yes — `employees` table (email lookup, password verification)

#### Cards & Sections:
| Section | Description |
|---------|------------|
| **Company Branding** | Gadiel Technologies logo, tagline, and animated service chips (IT, Cloud, Security, etc.) |
| **Sign In Form** | Email + password inputs. Submits to `POST /api/v1/auth/login` |
| **Set Password Flow** | If employee has no password set, the "First Time?" link triggers email verification → OTP → new password setup |
| **Service Chips** | 6 animated badges showing Gadiel's service offerings |

#### How to Use:
1. Enter your work email (e.g. `utkarshj@gadieltechnologies.com`)
2. Enter your password
3. Click **Sign In**
4. If first time, click "First Time?" to set up your password via email OTP

---

### 2. Dashboard

**Route:** `/`  
**Access:** All authenticated users  
**DB Linked:** ✅ Yes — `employees`, `attendance_logs`, `leave_requests`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Welcome Hero** | Personalized greeting with employee name + avatar + time-of-day message. Shows a motivational quote. | `employees` |
| **Profile Picture Upload** | Click avatar to upload/change profile picture with crop & adjust | `employee_profiles` |
| **Quick Stats Row** | 3 mini-cards: Today's Date, Current Time, Attendance Status | `attendance_logs` |
| **Punch In/Out Section** | Large button to punch in or out. Shows current status (office/WFH), punch-in time, working hours. GPS location is captured on punch. | `attendance_logs`, `geofence_zones` |
| **WFH Toggle** | Switch to declare Work From Home (skips GPS validation) | `attendance_logs` |
| **Leave Balance Cards** | Shows Earned, Sick, Casual leave balances with used/remaining | `leave_balances`, `leave_types` |
| **Apply Leave Button** | Opens leave application dialog (links to Attendance & Leaves page) | — |
| **Org Chart** | Interactive organizational tree showing reporting hierarchy. Click any node to view employee profile. | `employees` (reporting_manager_id) |

#### How to Use:
1. View your attendance status at a glance
2. Click **Punch In** to mark attendance (GPS is captured automatically)
3. Toggle **WFH** if working from home before punching in
4. View leave balances and navigate to apply leave
5. Explore the org chart to see the team structure

---

### 3. Attendance & Leaves

**Route:** `/attendance`  
**Access:** All authenticated users  
**DB Linked:** ✅ Yes — `attendance_logs`, `leave_requests`, `leave_balances`, `leave_types`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Leave Balance Cards** | Color-coded cards for each leave type (EL, SL, CL) showing total/used/remaining with circular progress | `leave_balances` |
| **Apply Leave Button** | Opens dialog to select leave type, dates, and reason | `leave_requests` |
| **My Leave History** | Table listing all leave requests with status badges (Approved/Pending/Rejected), dates, and type | `leave_requests` |
| **Pending Approvals** *(Manager/HR only)* | Cards showing team members' pending leave requests with Approve/Reject actions | `leave_requests` |
| **Reject Reason Dialog** | When rejecting a leave, a dialog prompts for the reason | `leave_requests` |
| **Attendance Summary** | *(Accessible from Dashboard)* Shows monthly attendance data | `attendance_logs` |

#### How to Use:
1. **Employee:** View leave balances → click "Apply Leave" → select type, dates, reason → submit
2. **Manager/HR:** Scroll down to "Pending Approvals" → click ✓ to approve or ✗ to reject with reason
3. Track all historical leave requests in "My Leave History"

---

### 4. Tasks

**Route:** `/tasks`  
**Access:** All authenticated users (creation based on permission)  
**DB Linked:** ✅ Yes — `tasks`, `employees`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Premium Dark Header** | Page title "Mission Control" with gradient background | — |
| **Status Summary Strip** | 5 clickable stat cards: To Do, In Progress, Review, Blocked, Done — with count and color-coded dots. Click to filter. | `tasks` |
| **Delegate Mission** *(if permitted)* | Form to create new task: Title, Description, Assignee dropdown, Deadline, Priority. If user lacks permission, shows "Assign permission disabled" warning. | `tasks` |
| **Active Missions List** | Scrollable list of all visible tasks. Each card shows: title, assignee avatar, status badge, priority tag, due date, progress bar. | `tasks` |
| **Status Dropdown** | On each task card: click the status dropdown to change task status (To Do → In Progress → Review → Done) | `tasks` |
| **Progress Slider** | Drag to update task completion percentage (0-100%) | `tasks` |

#### Who Can Assign Tasks:
| Person/Role | Can Assign To |
|-------------|--------------|
| `super_admin` / `hr_admin` | Everyone |
| Vishal, Namrata | Everyone (`*`) |
| Karthik | Akanksha, Utkarsh, Shruti, Ashish |
| Utkarsh | Tejveer, Tushar |
| Managers | Their direct reports (from `reporting_manager_id`) |

#### How to Use:
1. View task counts at the top — click any status to filter
2. Fill in the "Delegate Mission" form and click **Deploy Mission** to create a task
3. On any task card, change status or adjust progress
4. Assignees can update status and progress; assigners can edit everything

---

### 5. Salary & Payslips

**Route:** `/salary`  
**Access:** All authenticated users  
**DB Linked:** ✅ Yes — `salary_components`, `payslips`, `payroll_runs`, `salary_trackers`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Dark Gradient Header** | "Compensation Hub" title with interactive stat chips | — |
| **Salary Overview Strip** | 4 stat cards: Gross Monthly, Net Monthly, Annual CTC, Deductions | `salary_components` |
| **Salary Breakdown Chart** | Animated donut chart showing salary component distribution (Basic, HRA, Special, Transport, Medical) | `salary_components` |
| **Component Detail Table** | Tabular breakdown of Basic Salary, HRA, Medical Allowance, Transport Allowance, Special Allowance, and all deductions | `salary_components` |
| **Budget Tracker** *(Personal)* | Add income/expense entries with categories. Shows running balance. Each user's tracker is private. | `salary_trackers`, `salary_tracker_records` |
| **Monthly Payslip History** | List of generated payslips by month/year with download buttons | `payslips` |
| **Admin: Run Payroll** *(Super Admin/HR only)* | Select month/year → generate payslips for all employees in one click | `payroll_runs`, `payslips` |
| **Admin: Upload Payslip PDF** *(Super Admin/HR only)* | Upload official PDF payslips per employee per month | `payslips` |

#### How to Use:
1. **Employee:** View salary breakdown → download payslips → manage personal budget tracker
2. **Admin:** Click "Run Payroll" → select month → generate all payslips → optionally upload PDF versions

---

### 6. Monthly Report

**Route:** `/monthly-report`  
**Access:** `super_admin`, `hr_admin`, Vishal, Namrata only  
**DB Linked:** ✅ Yes — `tasks`, `attendance_logs`, `leave_requests`, `payroll_runs`, `payslips`, `employees`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Dark Gradient Header** | "Intelligence Hub" with month/year picker and "Export" button | — |
| **KPI Summary Strip** | 4 metric cards: Avg Attendance %, Tasks Completed, Leave Utilization %, Payroll Processed | Multiple tables |
| **Tasks Analytics** | Charts showing task distribution by status, completion trends | `tasks` |
| **Attendance Analytics** | Attendance rate visualization, late-coming trends | `attendance_logs` |
| **Leave Analytics** | Leave type distribution, top leave-takers | `leave_requests` |
| **Payroll Summary** | Total payroll cost, average salary, department-wise breakdown | `payslips`, `salary_components` |
| **Per-Employee Table** | Detailed table with every employee's attendance days, tasks completed, leaves taken, and salary for the selected month | All tables joined |

#### How to Use:
1. Select month and year from the picker at the top
2. View organizational KPIs at a glance
3. Scroll through section-wise analytics (Tasks → Attendance → Leaves → Payroll)
4. Use the per-employee breakdown table for individual performance review

---

### 7. Geofence Zones

**Route:** `/geofence`  
**Access:** All users can view; `super_admin` / `hr_admin` can manage  
**DB Linked:** ✅ Yes — `geofence_zones`, `employees`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Dark Gradient Hero** | "Geofence Zones" title with 4 stat chips: Active zone count, Assigned employees, WFH count, Global access count | `geofence_zones`, `employees` |
| **"+ New Zone" Button** *(Admin only)* | Opens dialog to create a new GPS zone with name, coordinates, radius, and employee assignment | `geofence_zones` |
| **Zone Cards** | Each zone shows: name, color-coded icon (active=blue gradient, inactive=grey), radius, member count. Expandable to show lat/lng details + "Open in Maps" link | `geofence_zones` |
| **Zone Actions** *(Admin only)* | Toggle active/inactive, Edit, Delete buttons on each zone card | `geofence_zones` |
| **Team Locations Sidebar** | Searchable employee list with initial avatars and color-coded status badges: WFH (amber), Site (blue), Global (green). Shows protocol legend chips. | `employees` |
| **Delete Confirmation Dialog** | When deleting a zone, shows employee impact warning | — |

#### How to Use:
1. **Admin:** Click "+ New Zone" → enter GPS coordinates and radius → assign employees → save
2. **Admin:** Toggle zones on/off, edit coordinates, or delete zones
3. **View:** See which employees are assigned to which GPS zone in the sidebar
4. Employees assigned to a zone must punch in within that GPS radius

---

### 8. Profile

**Route:** `/profile`  
**Access:** All authenticated users (own profile only)  
**DB Linked:** ✅ Yes — `employees`, `employee_profiles`, `departments`, `designations`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Profile Header** | Large avatar with upload capability, full name, designation, department, emp code | `employees` |
| **About Section** | Editable bio/about text | `employee_profiles` |
| **Personal Information** | Phone, email, personal email, blood group, PAN, gender, marital status, DOB | `employees` |
| **Employment Details** | Department, designation, employment type, date of joining, reporting manager | `employees` |
| **Skills & Expertise** | Tag-based skill list (add/remove) | `employee_profiles` |
| **Assets Assigned** | List of company assets (laptop, phone, etc.) assigned to the employee | `employee_profiles` |
| **Certifications** | List of professional certifications with dates | `employee_profiles` |
| **Social Links** | LinkedIn, GitHub, portfolio, etc. | `employee_profiles` |

#### How to Use:
1. Click the avatar to upload a new profile picture (crop & adjust dialog)
2. Edit the About section with free-form text
3. Add skills, assets, certifications, and social links
4. View employment details (read-only for non-HR users)

---

### 9. Notifications

**Route:** `/notifications`  
**Access:** All authenticated users  
**DB Linked:** ✅ Yes — `notifications`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Notification List** | Chronological list of all notifications with: type icon, title, message, timestamp, read/unread status | `notifications` |
| **"Mark All Read" Button** | Marks all notifications as read in one click | `notifications` |
| **Notification Types** | Leave approved/rejected, task assigned, attendance alerts, system announcements | `notifications` |
| **Unread Badge** | Shown on the bottom nav and header bell icon | `notifications` |

#### How to Use:
1. View all notifications in chronological order
2. Unread notifications appear with a highlighted background
3. Click "Mark All Read" to clear the unread count
4. Notification count auto-refreshes every 30 seconds

---

### 10. Employee Detail

**Route:** `/employees/:id`  
**Access:** Managers can view direct reports; HR/Admin can view all  
**DB Linked:** ✅ Yes — `employees`, `employee_profiles`, `departments`, `designations`

#### Cards & Sections:
| Card | Description | DB Table |
|------|------------|----------|
| **Employee Header** | Avatar, name, designation, status badge | `employees` |
| **Contact Information** | Email, phone, personal email | `employees` |
| **Employment Details** | Department, role, employment type, DOJ, reporting manager | `employees` |
| **Quick Actions** *(HR only)* | Edit employee details link | `employees` |

#### How to Use:
1. Navigate via the org chart or search bar in the header
2. View the employee's complete profile information
3. HR users can click "Edit" to modify employee details

---

## Database Synchronisation

Every card and section in the app is backed by live database queries. There is **no static/mock data** — everything syncs in real-time through the FastAPI REST API.

### Sync Architecture

```
┌─────────────┐    TanStack Query     ┌──────────────┐     SQLAlchemy      ┌──────────┐
│  React UI   │ ←──────────────────→  │  FastAPI API  │ ←────────────────→  │  MySQL   │
│  (Frontend) │   JSON over HTTP      │  (Backend)    │   Async Queries     │  (DB)    │
└─────────────┘   with JWT Auth       └──────────────┘                      └──────────┘
```

### Key API Endpoints ↔ DB Tables

| API Endpoint | HTTP Method | DB Table(s) | Description |
|-------------|-------------|-------------|-------------|
| `/api/v1/auth/login` | POST | `employees` | Email + password login, returns JWT |
| `/api/v1/auth/set-password` | POST | `employees` | First-time password setup |
| `/api/v1/employees/me` | GET | `employees` | Current logged-in user info |
| `/api/v1/employees/org-chart` | GET | `employees` | Full org hierarchy |
| `/api/v1/attendance/punch` | POST | `attendance_logs`, `geofence_zones` | Punch in/out with GPS |
| `/api/v1/attendance/today` | GET | `attendance_logs` | Today's punch record |
| `/api/v1/leaves/balance` | GET | `leave_balances` | Current leave balance |
| `/api/v1/leaves/apply` | POST | `leave_requests` | Submit leave application |
| `/api/v1/leaves/pending` | GET | `leave_requests` | Pending approvals for managers |
| `/api/v1/tasks` | GET/POST | `tasks` | List or create tasks |
| `/api/v1/tasks/:id` | PATCH | `tasks` | Update task status/progress |
| `/api/v1/compensation/overview` | GET | `salary_components` | Salary breakdown |
| `/api/v1/compensation/payslips` | GET | `payslips` | Payslip history |
| `/api/v1/compensation/run-payroll` | POST | `payroll_runs`, `payslips` | Generate monthly payroll |
| `/api/v1/reports/monthly` | GET | Multiple | Org-wide analytics |
| `/api/v1/attendance/zones` | GET/POST/PATCH/DELETE | `geofence_zones` | Zone CRUD |
| `/api/v1/notifications` | GET | `notifications` | User notifications |
| `/api/v1/profile` | GET/PATCH | `employee_profiles` | Profile data |

### Real-time Features
- **Attendance status** refreshes on each page load
- **Notification count** polls every 30 seconds
- **Task list** uses stale-while-revalidate with 30s freshness
- **Leave balances** recalculate after every approval/rejection

---

## Design System

### "Kinetic Culture" Theme

The app uses a custom design language called **Kinetic Culture** with CSS variables for full light/dark mode support.

#### Color Palette
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--c-bg` | `#F1F5F9` | `#0B1120` | Page background |
| `--c-card` | `#FFFFFF` | `#111827` | Card surfaces |
| `--c-t1` | `#0F172A` | `#F1F5F9` | Primary text |
| `--c-t2` | `#334155` | `#CBD5E1` | Secondary text |
| `--c-t3` | `#64748B` | `#94A3B8` | Muted text |
| Primary Blue | `#2563EB` | `#3B82F6` | Actions, links, active states |
| Success Green | `#16A34A` | `#22C55E` | Approved, active indicators |
| Warning Amber | `#D97706` | `#F59E0B` | Pending, late indicators |
| Danger Red | `#DC2626` | `#EF4444` | Rejected, errors |

#### Typography
- **Headings:** Plus Jakarta Sans (extrabold, 800 weight)
- **Body:** Be Vietnam Pro
- **Monospace data:** System mono stack

#### Component Classes
- `.card-kinetic` — Premium card with rounded corners, subtle border, and frosted glass effect
- `.input-kinetic` — Styled input with smooth focus transitions
- `.btn-primary` — Blue gradient button with hover/active states
- `.glass-panel` — Frosted glass effect with backdrop blur
- `.page-enter` — Entrance animation for page transitions

#### Premium Page Headers
All admin-level pages (Salary, Monthly Report, Geofence) use a **dark gradient hero header** with:
- Deep navy-to-blue gradient background
- Decorative radial gradient orbs
- White typography
- Compact stat chips with icons
- Prominent CTA button

#### Responsive Breakpoints
- **Mobile:** `< 768px` — Bottom nav, stacked layouts, full-width cards
- **Tablet:** `768px - 1024px` — 2-column grids, hidden sidebar
- **Desktop:** `> 1024px` — 3-column grids, search bar in header, expanded org chart

---

## Navigation

### Desktop (Sidebar)
| Menu Item | Route | Visible To |
|-----------|-------|------------|
| Dashboard | `/` | All |
| Attendance & Leaves | `/attendance` | All |
| Notifications | `/notifications` | All |
| Tasks | `/tasks` | All |
| Salary | `/salary` | All |
| Monthly Report | `/monthly-report` | Admin/HR/Vishal/Namrata |
| Geofence | `/geofence` | Admin/HR |

### Mobile (Bottom Nav - 5 items)
| Tab | Route |
|-----|-------|
| Home | `/` |
| Attendance | `/attendance` |
| Tasks | `/tasks` |
| Salary | `/salary` |
| Alerts | `/notifications` |

### Profile Dropdown (Header)
| Item | Action |
|------|--------|
| My Profile | Navigate to `/profile` |
| Sign Out | Clear JWT + redirect to `/login` |

---

## Active Employees (as of 29 March 2026)

| Emp Code | Name | Department | Role |
|----------|------|-----------|------|
| GTPL-001 | Vishal Mantoo | Management | `super_admin` |
| GTPL-25002 | Utkarsh Jha | IT & Consultancy | `super_admin` |
| GTPL-25003 | Namrata Dudha | HR & Sustainability | `hr_admin` |
| GTPLT-25005 | Karthik Pandian | Sales | `manager` |
| GTPL-25010 | Shruti Sharma | IT & Consultancy | `manager` |
| GTPL-25011 | Akanksha Bhat | IT & Consultancy | `manager` |
| GTPPT-26003 | Ashish Suri | IT & Consultancy | `manager` |
| GTPL-25007 | Pratima Maurya | IT & Consultancy | `employee` |
| GTPL-25009 | Sonali Verma | IT & Consultancy | `employee` |
| GTPL-25014 | Monika | IT & Consultancy | `employee` |
| GTPLT-25013 | Tejveer Singh | IT & Consultancy | `employee` |
| GTPPT-26001 | Sneha Sharma | IT & Consultancy | `employee` |
| GTPPT-26002 | Nikitasha Sharma | IT & Consultancy | `employee` |
| GTPPT-26004 | Shambhavi Kholia | IT & Consultancy | `employee` |
| GTPPT-26005 | Tushar Anupam Kumar | IT & Consultancy | `employee` |
| GTPPT-26006 | Sahil Raturi | IT & Consultancy | `employee` |
| GTPPT-26007 | Ridhi | IT & Consultancy | `employee` |

**Total Active Employees:** 17

---

*© 2026 Gadiel Technologies Pvt. Ltd. All rights reserved.*
