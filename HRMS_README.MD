# 🏢 AI-Powered HRMS — Human Resource Management System

> A fully-fledged, AI-driven HRMS platform with GPS attendance, selfie verification, leave management, task tracking, built-in chat, and a conversational HR assistant — designed to integrate with any organization's database out of the box.

---

## 📑 Table of Contents

1. [Product Overview](#product-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [System Components](#system-components)
4. [Tech Stack](#tech-stack)
5. [Database Design](#database-design)
6. [Module Breakdown](#module-breakdown)
   - [Attendance Management](#1-attendance-management)
   - [Task & Role Management](#2-task--role-management)
   - [Leave Management](#3-leave-management)
   - [Organization DB Integration](#4-organization-database-integration)
   - [Communication & Projects](#5-communication--project-management)
   - [AI HR Assistant](#6-ai-powered-hr-assistant)
7. [API Architecture](#api-architecture)
8. [Security Design](#security-design)
9. [Deployment Architecture](#deployment-architecture)
10. [Project Folder Structure](#project-folder-structure)
11. [Setup & Installation](#setup--installation)
12. [Environment Variables](#environment-variables)
13. [Excel / CSV Data Ingestion](#excel--csv-data-ingestion)
14. [Multi-Tenant Design](#multi-tenant-design)
15. [Scalability & Performance](#scalability--performance)
16. [Roadmap](#roadmap)

---

## Product Overview

This HRMS is built as a **multi-tenant, API-first platform** that any organization can plug into by sharing their employee/org data (via Excel, CSV, or direct API). The system auto-generates its database schema, configures org-specific rules, and becomes operational immediately.

### Core Pillars

| Pillar                       | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| **Smart Attendance**         | GPS + Selfie verification with anti-spoofing     |
| **Intelligent Leave Engine** | Policy-aware auto-approval/rejection             |
| **Task Intelligence**        | Role/dept/project-based assignment with tracking |
| **Universal DB Connector**   | Works with any org's data source                 |
| **Collaboration Hub**        | Chat + project management in one workspace       |
| **AI HR Assistant**          | Claude/GPT-powered conversational HR layer       |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                      │
│                                                                               │
│   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐  │
│   │  Web App    │   │ Mobile App  │   │ Admin Portal │   │  HR Portal   │  │
│   │  (React)    │   │(React Native│   │   (React)    │   │   (React)    │  │
│   └──────┬──────┘   └──────┬──────┘   └──────┬───────┘   └──────┬───────┘  │
└──────────┼────────────────┼────────────────┼──────────────────┼────────────┘
           │                │                │                  │
           └────────────────┴────────────────┴──────────────────┘
                                      │
                             ┌────────▼────────┐
                             │   API Gateway    │
                             │  (Kong / Nginx)  │
                             │  + Auth/Rate     │
                             │    Limiting      │
                             └────────┬─────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────────┐
          │                           │                               │
   ┌──────▼──────┐           ┌────────▼───────┐             ┌────────▼───────┐
   │  Core API   │           │   AI Service   │             │  Realtime      │
   │  (FastAPI)  │           │  (LLM Engine)  │             │  Service       │
   │             │           │  Claude/GPT-4  │             │  (WebSocket)   │
   └──────┬──────┘           └────────┬───────┘             └────────┬───────┘
          │                           │                               │
          └───────────────────────────┼───────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────────────┐
         │                            │                                    │
  ┌──────▼──────┐            ┌────────▼────────┐                  ┌───────▼──────┐
  │  PostgreSQL  │            │  Redis Cache    │                  │  Object      │
  │  (Primary   │            │  + Pub/Sub      │                  │  Storage     │
  │  DB)        │            │                 │                  │  (S3/MinIO)  │
  └──────┬──────┘            └─────────────────┘                  └──────────────┘
         │
  ┌──────▼──────┐
  │  Tenant     │
  │  Schema     │
  │  Isolation  │
  └─────────────┘
```

---

## System Components

| Component                     | Role                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **API Gateway**               | Entry point — handles routing, rate limiting, JWT validation, tenant resolution |
| **Core API (FastAPI)**        | Business logic for all HR modules                                               |
| **AI Service**                | LLM-powered assistant, decision engine for leave/attendance                     |
| **Realtime Service**          | WebSocket layer for chat, live notifications, and attendance events             |
| **PostgreSQL**                | Primary relational database with per-tenant schema isolation                    |
| **Redis**                     | Caching, session management, pub/sub for realtime events                        |
| **Object Storage**            | Selfie images, documents, Excel uploads                                         |
| **Task Queue (Celery)**       | Background jobs — reminders, report generation, email alerts                    |
| **Message Broker (RabbitMQ)** | Inter-service communication                                                     |

---

## Tech Stack

### Backend

```
Language        : Python 3.11+
Framework       : FastAPI (async)
ORM             : SQLAlchemy 2.0 + Alembic (migrations)
Task Queue      : Celery + Redis
Message Broker  : RabbitMQ
Auth            : JWT (access + refresh tokens) + OAuth2
AI/LLM          : Anthropic Claude API / OpenAI GPT-4 (configurable)
Face Matching   : DeepFace / AWS Rekognition (selfie verification)
Geofencing      : Shapely + PostGIS (server-side GPS validation)
Excel Ingestion : Pandas + OpenPyXL
Email           : SendGrid / SMTP
Push Alerts     : Firebase Cloud Messaging (FCM)
```

### Frontend

```
Framework       : React 18 + TypeScript
State           : Redux Toolkit + RTK Query
UI Components   : shadcn/ui + Tailwind CSS
Maps/GPS        : Mapbox GL JS / Google Maps API
Realtime        : Socket.IO Client
Charts          : Recharts / ApexCharts
Mobile          : React Native + Expo
```

### Infrastructure

```
Container       : Docker + Docker Compose
Orchestration   : Kubernetes (production)
Reverse Proxy   : Nginx
CI/CD           : GitHub Actions
Cloud           : AWS / GCP / Azure (configurable)
Database        : PostgreSQL 15 + PostGIS extension
Cache           : Redis 7
Object Storage  : AWS S3 / MinIO (self-hosted)
Monitoring      : Prometheus + Grafana
Logging         : ELK Stack (Elasticsearch, Logstash, Kibana)
```

---

## Database Design

### Multi-Tenant Strategy: **Schema-per-Tenant**

Every organization gets an isolated PostgreSQL schema (`org_{tenant_id}`). A shared `public` schema holds tenant metadata.

```sql
-- PUBLIC SCHEMA (shared)
public.tenants           -- org registry
public.tenant_configs    -- org-specific rules and policies
public.admin_users       -- super-admin accounts

-- PER-TENANT SCHEMA (example: org_gadiel_tech)
org_gadiel_tech.employees
org_gadiel_tech.departments
org_gadiel_tech.designations
org_gadiel_tech.roles
org_gadiel_tech.attendance_logs
org_gadiel_tech.shifts
org_gadiel_tech.geofence_zones
org_gadiel_tech.leaves
org_gadiel_tech.leave_policies
org_gadiel_tech.tasks
org_gadiel_tech.projects
org_gadiel_tech.messages
org_gadiel_tech.notifications
org_gadiel_tech.payroll_config
```

### Core Table Schemas

```sql
-- employees
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_code        VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    department_id   UUID REFERENCES departments(id),
    designation_id  UUID REFERENCES designations(id),
    role_id         UUID REFERENCES roles(id),
    manager_id      UUID REFERENCES employees(id),
    date_of_joining DATE NOT NULL,
    employment_type VARCHAR(50),  -- full_time, part_time, contract
    status          VARCHAR(20) DEFAULT 'active',
    face_embedding  JSONB,        -- stored face vector for selfie matching
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- attendance_logs
CREATE TABLE attendance_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID REFERENCES employees(id),
    date            DATE NOT NULL,
    punch_in        TIMESTAMPTZ,
    punch_out       TIMESTAMPTZ,
    punch_in_lat    DECIMAL(9,6),
    punch_in_lng    DECIMAL(9,6),
    punch_out_lat   DECIMAL(9,6),
    punch_out_lng   DECIMAL(9,6),
    punch_in_selfie VARCHAR(500),  -- S3 key
    punch_out_selfie VARCHAR(500),
    face_match_score DECIMAL(5,2),
    location_valid  BOOLEAN,
    status          VARCHAR(30),  -- present, absent, late, half_day, wfh
    shift_id        UUID REFERENCES shifts(id),
    overtime_mins   INTEGER DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- leaves
CREATE TABLE leaves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID REFERENCES employees(id),
    leave_type_id   UUID REFERENCES leave_types(id),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    days            DECIMAL(4,1) NOT NULL,
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, auto_approved
    approved_by     UUID REFERENCES employees(id),
    ai_decision     JSONB,   -- stores AI reasoning
    applied_at      TIMESTAMPTZ DEFAULT now(),
    decided_at      TIMESTAMPTZ
);

-- tasks
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    project_id      UUID REFERENCES projects(id),
    assigned_by     UUID REFERENCES employees(id),
    assigned_to     UUID REFERENCES employees(id),
    department_id   UUID REFERENCES departments(id),
    priority        VARCHAR(20) DEFAULT 'medium',
    status          VARCHAR(30) DEFAULT 'todo',
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## Module Breakdown

### 1. Attendance Management

#### Flow

```
Employee opens app
       │
       ▼
GPS coordinates captured ──► Server validates against geofence zones
       │                              │
       │                     ┌────────▼────────┐
       │                     │  Within zone?    │
       │                     └────────┬─────────┘
       │                          Yes │  No ──► Reject with reason
       ▼                              ▼
Selfie captured             Face matching engine
       │                     (compare with stored
       │                      face embedding)
       └─────────────────────────────►│
                                      ▼
                              Match score ≥ 85%?
                              Yes ──► Mark punch-in
                              No  ──► Reject / flag for review
```

#### Anti-Spoofing Measures

| Vector               | Countermeasure                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| **GPS Spoofing**     | Cross-check with device sensor data, IP geolocation, sudden location jumps detection |
| **Photo Replay**     | Liveness detection (blink/smile prompt) via ML model                                 |
| **Proxy Attendance** | Face embedding match — only registered face can punch                                |
| **VPN/Tunnel**       | Device fingerprint + IP reputation check                                             |

#### Shift & Overtime Engine

```python
# Pseudo-logic
def compute_attendance_status(employee, punch_in, punch_out, shift):
    late_mins = max(0, (punch_in - shift.start_time).minutes)
    early_exit_mins = max(0, (shift.end_time - punch_out).minutes)
    overtime_mins = max(0, (punch_out - shift.end_time).minutes)

    if late_mins > shift.grace_period_mins:
        status = "late"
    elif working_hours < shift.min_hours_for_halfday:
        status = "half_day"
    else:
        status = "present"

    return AttendanceStatus(status, late_mins, overtime_mins)
```

---

### 2. Task & Role Management

#### Assignment Matrix

```
Task creation
      │
      ├── Assign to: Individual employee
      ├── Assign to: Designation (all Sr. Engineers)
      ├── Assign to: Department (all of Engineering)
      └── Assign to: Project (all members of Project Alpha)
             │
             ▼
    Notification dispatched via:
    - In-app alert
    - Email
    - Push notification (mobile)
    - Chat message
```

#### Task States

```
todo ──► in_progress ──► in_review ──► done
  │                                      │
  └──── blocked ◄───────────────────────┘
              │
              └──► escalated ──► HR/Manager alert
```

#### Performance Tracking

- Completion rate per employee (weekly/monthly)
- Average task turnaround time
- Overdue task count
- Manager-visible dashboards with drill-down by dept/project

---

### 3. Leave Management

#### Leave Decision Engine

```python
def evaluate_leave_request(employee_id, leave_type, days, from_date, to_date):

    # Step 1: Balance check
    balance = get_leave_balance(employee_id, leave_type)
    if balance < days:
        return Decision(action="reject", reason="Insufficient leave balance")

    # Step 2: Policy check
    policy = get_leave_policy(leave_type, employee.department)
    if not policy.allows_advance_booking(from_date):
        return Decision(action="reject", reason="Advance booking not allowed")

    # Step 3: Team availability check
    team_on_leave = get_team_leaves_on_date_range(employee.team, from_date, to_date)
    if team_on_leave >= policy.max_concurrent_leaves:
        return Decision(action="reject", reason="Team coverage threshold breached")

    # Step 4: Attendance history
    recent_attendance = get_attendance_score(employee_id, last_30_days)
    if recent_attendance < policy.min_attendance_pct:
        return Decision(action="escalate", reason="Low attendance — requires HR approval")

    # Step 5: Auto-approve check
    if days <= policy.auto_approve_max_days and not policy.requires_document:
        return Decision(action="auto_approve")

    return Decision(action="send_to_manager")
```

#### Leave Types Supported

| Type                    | Logic                                               |
| ----------------------- | --------------------------------------------------- |
| Casual Leave            | From accrued balance, max consecutive days enforced |
| Sick Leave              | Medical cert required for > N days                  |
| Paid Leave / EL         | Carry-forward rules applied                         |
| LWP (Leave Without Pay) | Auto-calculated if balance exhausted                |
| Maternity / Paternity   | Statutory rules, document-gated                     |
| Compensatory Off        | Auto-generated from overtime logs                   |
| WFH                     | Separate workflow, no leave balance deducted        |

---

### 4. Organization Database Integration

#### Ingestion Pipeline

```
Excel / CSV Upload
       │
       ▼
┌─────────────────────┐
│ Schema Detector      │   ── Reads headers + sample rows
│ (Pandas profiler)   │   ── Infers column types
└──────────┬──────────┘   ── Maps to HRMS entities
           │
           ▼
┌─────────────────────┐
│ Field Mapper         │   ── AI-assisted mapping
│ (LLM + rules)       │   ── "emp_name" → employees.name
└──────────┬──────────┘   ── Flags ambiguous columns for review
           │
           ▼
┌─────────────────────┐
│ Validator            │   ── Checks for nulls, duplicates
│                      │   ── Validates email/phone formats
└──────────┬──────────┘   ── Generates validation report
           │
           ▼
┌─────────────────────┐
│ Tenant Schema        │   ── Creates org schema in Postgres
│ Generator            │   ── Runs Alembic migrations
└──────────┬──────────┘   ── Seeds data
           │
           ▼
    HRMS is live for the organization ✅
```

#### Supported Excel Sheets for Auto-Ingestion

```
employees.xlsx       → employees table + department/designation seeds
departments.xlsx     → departments table
leave_policies.xlsx  → leave_types + leave_policy_rules
shifts.xlsx          → shifts + shift_assignments
geofences.xlsx       → geofence_zones (lat/lng + radius)
holidays.xlsx        → org_holidays
projects.xlsx        → projects + project_members
```

---

### 5. Communication & Project Management

#### Chat Architecture

```
Client ──WebSocket──► Socket.IO Server ──► Redis Pub/Sub
                              │
                              ▼
                     Message Router
                     ┌────────────────────────┐
                     │  Direct Message         │
                     │  Team Channel           │
                     │  Project Group          │
                     │  Department Broadcast   │
                     │  HR Announcements       │
                     └───────────┬────────────┘
                                 │
                          PostgreSQL (messages table)
                          + Redis (online presence, typing)
```

#### Project Management Features

| Feature              | Description                            |
| -------------------- | -------------------------------------- |
| **Kanban Board**     | Drag-drop task states (Todo → Done)    |
| **Timeline View**    | Gantt-style project milestones         |
| **Sprint Tracker**   | Iterative sprint planning + velocity   |
| **File Attachments** | Upload to S3, linked to tasks/projects |
| **Activity Log**     | Full audit trail per project           |
| **Status Reports**   | Weekly auto-generated summaries via AI |

---

### 6. AI-Powered HR Assistant

#### Architecture

```
Employee / Manager asks a question
              │
              ▼
┌─────────────────────────────────┐
│     Intent Classifier           │
│  (fine-tuned or prompted LLM)   │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
HR Query              Action Request
(fetch data)          (approve leave,
    │                  assign task, etc.)
    ▼                     │
Tool Selection            ▼
(SQL generator)    Permission Check
    │                     │
    ▼                     ▼
DB Query          Execute via Core API
    │
    ▼
LLM Summarizes result → Natural language response
```

#### AI Tools / Functions Available to the Assistant

```python
tools = [
    "get_employee_info",          # fetch profile, team, designation
    "get_attendance_summary",     # date-range attendance stats
    "get_leave_balance",          # per employee per leave type
    "get_task_status",            # tasks assigned/pending/done
    "get_team_availability",      # who's on leave today/this week
    "generate_report",            # export PDF/Excel report
    "approve_leave",              # manager-level action
    "assign_task",                # manager-level action
    "answer_policy_question",     # RAG over HR policy documents
    "get_payroll_summary",        # salary/component info
]
```

#### Sample Interactions

```
Employee: "How many leaves do I have left this year?"
AI: "You have 8 Earned Leaves, 3 Casual Leaves, and 2 Sick Leaves
     remaining as of today."

Manager: "Who in my team is absent this week?"
AI: "Rahul Sharma (Annual Leave, Mon-Wed), Priya Singh (Sick Leave, Tue).
     Rest of the team is present."

HR: "Generate an attendance report for Engineering dept for March 2025"
AI: [generates Excel file and returns download link]
```

---

## API Architecture

### REST API Structure

```
/api/v1/
├── auth/
│   ├── POST   /login
│   ├── POST   /refresh
│   └── POST   /logout
│
├── employees/
│   ├── GET    /                    # list with filters
│   ├── POST   /                    # create
│   ├── GET    /{id}
│   ├── PATCH  /{id}
│   └── DELETE /{id}
│
├── attendance/
│   ├── POST   /punch-in
│   ├── POST   /punch-out
│   ├── GET    /logs                # with date/employee filters
│   ├── GET    /summary/{emp_id}
│   └── PATCH  /logs/{id}          # manual correction (HR only)
│
├── leaves/
│   ├── POST   /apply
│   ├── GET    /my-leaves
│   ├── GET    /team-leaves         # manager view
│   ├── PATCH  /{id}/approve
│   ├── PATCH  /{id}/reject
│   └── GET    /balance/{emp_id}
│
├── tasks/
│   ├── POST   /
│   ├── GET    /my-tasks
│   ├── GET    /assigned-by-me
│   ├── PATCH  /{id}/status
│   └── GET    /project/{project_id}
│
├── projects/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /{id}/members
│   └── GET    /{id}/progress
│
├── chat/
│   ├── GET    /channels
│   ├── POST   /channels
│   └── GET    /channels/{id}/messages
│
├── ai/
│   ├── POST   /chat                # conversational assistant
│   └── POST   /generate-report
│
├── admin/
│   ├── POST   /tenants             # onboard new org
│   ├── POST   /ingest/excel        # upload org data
│   └── GET    /tenants/{id}/health
│
└── reports/
    ├── GET    /attendance
    ├── GET    /leave
    └── GET    /performance
```

### WebSocket Events

```
// Client → Server
ws.emit("join_channel", { channel_id })
ws.emit("send_message", { channel_id, content, attachments })
ws.emit("typing_start", { channel_id })
ws.emit("punch_event", { type: "in"|"out", coords, selfie_data })

// Server → Client
ws.on("new_message", { message })
ws.on("attendance_confirmed", { log_id, status })
ws.on("task_assigned", { task })
ws.on("leave_decided", { leave_id, status, reason })
ws.on("notification", { type, payload })
```

---

## Security Design

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────┐
│                   Security Layers                    │
│                                                      │
│  1. JWT Access Token (15 min TTL)                    │
│     + Refresh Token (7 days, rotated on use)         │
│                                                      │
│  2. Role-Based Access Control (RBAC)                 │
│     Roles: super_admin, hr_admin, manager, employee  │
│                                                      │
│  3. Tenant Isolation                                  │
│     Every DB query scoped to tenant schema           │
│     Middleware enforces tenant context               │
│                                                      │
│  4. API Rate Limiting                                 │
│     Per-user: 100 req/min                            │
│     Attendance endpoint: 2 req/min (anti-abuse)      │
│                                                      │
│  5. Data Encryption                                   │
│     AES-256 at rest (face embeddings, PII)           │
│     TLS 1.3 in transit                               │
│                                                      │
│  6. Audit Logging                                    │
│     Every state-changing action logged with actor,   │
│     timestamp, IP, and before/after state            │
└─────────────────────────────────────────────────────┘
```

### RBAC Permission Matrix

| Resource               | Super Admin | HR Admin | Manager        | Employee  |
| ---------------------- | ----------- | -------- | -------------- | --------- |
| View all employees     | ✅          | ✅       | Team only      | Self only |
| Approve leave          | ✅          | ✅       | Direct reports | ❌        |
| Assign tasks           | ✅          | ✅       | ✅             | ❌        |
| View payroll           | ✅          | ✅       | ❌             | Self only |
| Manual attendance edit | ✅          | ✅       | ❌             | ❌        |
| Onboard organization   | ✅          | ❌       | ❌             | ❌        |
| Export reports         | ✅          | ✅       | Team only      | ❌        |

---

## Deployment Architecture

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: "3.9"
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [db, redis, rabbitmq]
    environment:
      - DATABASE_URL=postgresql://hrms:hrms@db:5432/hrms
      - REDIS_URL=redis://redis:6379

  worker:
    build: ./backend
    command: celery -A app.worker worker --loglevel=info
    depends_on: [db, redis, rabbitmq]

  realtime:
    build: ./realtime
    ports: ["8001:8001"]
    depends_on: [redis]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: hrms
      POSTGRES_USER: hrms
      POSTGRES_PASSWORD: hrms
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_password

volumes:
  postgres_data:
```

### Kubernetes (Production)

```
k8s/
├── namespaces/
│   └── hrms-prod.yaml
├── deployments/
│   ├── api-deployment.yaml          # 3 replicas, HPA enabled
│   ├── worker-deployment.yaml       # 2 replicas
│   └── realtime-deployment.yaml     # 2 replicas
├── services/
│   ├── api-service.yaml
│   └── realtime-service.yaml
├── ingress/
│   └── nginx-ingress.yaml           # TLS termination
├── configmaps/
│   └── app-config.yaml
├── secrets/
│   └── app-secrets.yaml             # encrypted with Sealed Secrets
└── hpa/
    └── api-hpa.yaml                  # scale 3-10 pods on CPU/RPS
```

---

## Project Folder Structure

```
hrms/
│
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── main.py                   # FastAPI app entrypoint
│   │   ├── config.py                 # Settings via Pydantic
│   │   ├── database.py               # SQLAlchemy engine + session
│   │   ├── middleware/
│   │   │   ├── tenant.py             # Tenant resolution middleware
│   │   │   ├── auth.py               # JWT validation
│   │   │   └── audit.py              # Audit log middleware
│   │   ├── models/                   # SQLAlchemy models
│   │   │   ├── employee.py
│   │   │   ├── attendance.py
│   │   │   ├── leave.py
│   │   │   ├── task.py
│   │   │   ├── project.py
│   │   │   └── message.py
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── routers/                  # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── attendance.py
│   │   │   ├── leave.py
│   │   │   ├── task.py
│   │   │   ├── ai_assistant.py
│   │   │   └── admin.py
│   │   ├── services/                 # Business logic layer
│   │   │   ├── attendance_service.py
│   │   │   ├── leave_engine.py       # Decision logic
│   │   │   ├── face_service.py       # Selfie verification
│   │   │   ├── geo_service.py        # Geofencing logic
│   │   │   ├── ai_service.py         # LLM integration
│   │   │   └── notification_service.py
│   │   ├── tasks/                    # Celery background tasks
│   │   │   ├── reminders.py
│   │   │   ├── reports.py
│   │   │   └── ingestion.py
│   │   └── utils/
│   │       ├── excel_parser.py       # Data ingestion utility
│   │       ├── schema_mapper.py      # AI-assisted field mapping
│   │       └── tenant_manager.py    # Tenant schema CRUD
│   ├── migrations/                   # Alembic migration files
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── realtime/                         # Socket.IO server (Node.js)
│   ├── src/
│   │   ├── index.ts
│   │   ├── handlers/
│   │   │   ├── chat.ts
│   │   │   ├── attendance.ts
│   │   │   └── notifications.ts
│   │   └── redis.ts                  # Pub/Sub adapter
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                         # React web application
│   ├── src/
│   │   ├── app/                      # Redux store
│   │   ├── components/               # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Attendance/
│   │   │   ├── Leave/
│   │   │   ├── Tasks/
│   │   │   ├── Chat/
│   │   │   └── AI-Assistant/
│   │   ├── hooks/
│   │   ├── services/                 # API clients
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
│
├── mobile/                           # React Native app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── AttendanceScreen/     # GPS + selfie capture
│   │   │   ├── LeaveScreen/
│   │   │   ├── TaskScreen/
│   │   │   └── ChatScreen/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── k8s/
│   └── terraform/                    # IaC for cloud deployment
│
├── data-templates/                   # Excel templates for org onboarding
│   ├── employees_template.xlsx
│   ├── departments_template.xlsx
│   ├── leave_policies_template.xlsx
│   └── geofences_template.xlsx
│
└── docs/
    ├── api-spec.yaml                 # OpenAPI 3.0 spec
    ├── architecture.md
    └── onboarding-guide.md
```

---

## Setup & Installation

### Prerequisites

```bash
# Required
Docker >= 24.0
Docker Compose >= 2.20
Node.js >= 20.x
Python >= 3.11
Git
```

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/hrms.git
cd hrms
```

### Step 2: Environment Setup

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp realtime/.env.example realtime/.env

# Edit backend/.env with your values (see next section)
nano backend/.env
```

### Step 3: Start Infrastructure Services

```bash
# Start all infrastructure (DB, Redis, RabbitMQ, MinIO)
docker compose up -d db redis rabbitmq minio

# Wait for DB to be healthy
docker compose ps
```

### Step 4: Initialize Database

```bash
# Run migrations
docker compose run --rm api alembic upgrade head

# Seed initial super-admin and system data
docker compose run --rm api python -m app.scripts.seed_superadmin
```

### Step 5: Start All Services

```bash
# Development mode (with hot-reload)
docker compose up

# Or start specific services
docker compose up api worker realtime frontend
```

### Step 6: Access the Application

| Service            | URL                         |
| ------------------ | --------------------------- |
| Web App            | http://localhost:3000       |
| API Docs (Swagger) | http://localhost:8000/docs  |
| API Docs (Redoc)   | http://localhost:8000/redoc |
| RabbitMQ Dashboard | http://localhost:15672      |
| MinIO Console      | http://localhost:9001       |

### Step 7: Onboard Your First Organization

```bash
# Via API (or use the Admin Portal)
curl -X POST http://localhost:8000/api/v1/admin/tenants \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "org_name": "Gadiel Technologies",
    "org_slug": "gadiel_tech",
    "admin_email": "hr@gadieltech.com",
    "timezone": "Asia/Kolkata"
  }'
```

---

## Environment Variables

```dotenv
# ─── Database ───────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://hrms:hrms@localhost:5432/hrms

# ─── Redis ──────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ─── RabbitMQ ───────────────────────────────────────────
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# ─── JWT ────────────────────────────────────────────────
JWT_SECRET_KEY=your_super_secret_key_here_min_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ─── AI / LLM ───────────────────────────────────────────
AI_PROVIDER=anthropic                  # anthropic | openai
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                  # fallback
AI_MODEL=claude-sonnet-4-20250514

# ─── Object Storage ─────────────────────────────────────
S3_ENDPOINT_URL=http://localhost:9000  # MinIO for dev, S3 for prod
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=minio_password
S3_BUCKET_SELFIES=hrms-selfies
S3_BUCKET_DOCUMENTS=hrms-documents

# ─── Face Verification ──────────────────────────────────
FACE_MATCH_PROVIDER=deepface           # deepface | aws_rekognition
FACE_MATCH_THRESHOLD=0.85
AWS_REKOGNITION_REGION=ap-south-1     # if using AWS

# ─── Notifications ──────────────────────────────────────
SENDGRID_API_KEY=SG....
NOTIFICATION_FROM_EMAIL=noreply@yourhrms.com
FCM_SERVER_KEY=...                     # Firebase for push notifications

# ─── App Config ─────────────────────────────────────────
ENVIRONMENT=development                # development | staging | production
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000"]
MAX_UPLOAD_SIZE_MB=10
```

---

## Excel / CSV Data Ingestion

### How it works

1. Download the provided Excel templates from `/data-templates/`
2. Fill in your organization's data
3. Upload via Admin Portal or API
4. The system auto-detects columns, maps to schema, validates, and imports

### Quick API Upload

```python
import requests

# Authenticate as super admin
token = "your_admin_token"

# Upload employee data Excel
with open("my_org_employees.xlsx", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/v1/admin/ingest/excel",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("employees.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={
            "tenant_id": "gadiel_tech",
            "sheet_type": "employees"   # employees | departments | leaves | shifts | geofences
        }
    )

print(response.json())
# { "status": "success", "rows_imported": 142, "warnings": [], "errors": [] }
```

### Expected Excel Format (Employees)

| emp_code | name         | email         | phone      | department  | designation  | manager_email   | date_of_joining | employment_type |
| -------- | ------------ | ------------- | ---------- | ----------- | ------------ | --------------- | --------------- | --------------- |
| EMP001   | Rahul Sharma | rahul@org.com | 9876543210 | Engineering | Sr. Engineer | lead@org.com    | 2022-03-01      | full_time       |
| EMP002   | Priya Singh  | priya@org.com | 9876543211 | HR          | HR Manager   | hr-head@org.com | 2021-01-15      | full_time       |

> Column names are flexible — the AI mapper will intelligently match your columns to the system schema.

---

## Multi-Tenant Design

### Tenant Resolution Flow

```
Incoming Request
      │
      ├── Via Subdomain:  gadieltech.yourhrms.com → tenant = "gadiel_tech"
      ├── Via Header:     X-Tenant-ID: gadiel_tech
      └── Via JWT Claim:  token.tenant_id = "gadiel_tech"
              │
              ▼
    Middleware sets db schema:
    SET search_path = org_gadiel_tech, public;
              │
              ▼
    All queries isolated to tenant schema ✅
```

---

## Scalability & Performance

| Concern                           | Solution                                                             |
| --------------------------------- | -------------------------------------------------------------------- |
| **High attendance concurrency**   | Redis queue for punch events, async DB writes                        |
| **Large org (10,000+ employees)** | Schema-per-tenant, indexed queries, read replicas                    |
| **Real-time chat at scale**       | Redis Pub/Sub + Socket.IO clustering                                 |
| **Report generation**             | Celery background tasks, pre-aggregated data                         |
| **Face matching speed**           | Precomputed embeddings stored in DB, vector similarity search        |
| **API throughput**                | Horizontal pod scaling (HPA on K8s), connection pooling (PgBouncer)  |
| **Caching**                       | Redis for employee profiles, leave balances, org configs (TTL-based) |

---

## Roadmap

### Phase 1 — Core (Months 1-3)

- [x] Multi-tenant architecture + onboarding
- [x] Employee management + Excel ingestion
- [x] GPS + Selfie attendance
- [x] Leave management with decision engine
- [x] Task assignment + tracking

### Phase 2 — Intelligence (Months 4-5)

- [ ] AI HR Assistant (Claude integration)
- [ ] Built-in chat system
- [ ] Project management module
- [ ] Automated report generation
- [ ] Mobile app (React Native)

### Phase 3 — Enterprise (Months 6-8)

- [ ] Payroll integration
- [ ] Performance review cycles
- [ ] Recruitment & onboarding workflow
- [ ] Learning Management System (LMS)
- [ ] Advanced analytics dashboards
- [ ] SSO / SAML integration (Okta, Azure AD)
- [ ] Audit trail & compliance exports (SOC 2)

---

## Contributing

```bash
# Create feature branch
git checkout -b feature/attendance-liveness-detection

# Run tests before PR
cd backend && pytest tests/ -v --cov=app

# Lint
ruff check app/ && black app/

# Submit PR against main
```

---

## License

MIT License © 2025 — Built for scalable, intelligent HR operations.

---

> **Built to integrate with any org. Designed to think like an HR professional.**
