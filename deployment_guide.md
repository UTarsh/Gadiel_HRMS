# Gadiel HRMS — Comprehensive Deployment & Operations Guide

This guide provides a step-by-step walkthrough for deploying and maintaining the Gadiel HRMS application on a production server.

---

## 1. Prerequisites

### Local Machine
- **Git** installed and configured.
- **SSH Client** (OpenSSH, usually built into Windows/Linux/macOS).
- **SSH Key Pair**: The private key `ssh-key-2026-03-31.key` must be present in the `ssh/` directory.

### Production Server
- **IP Address**: `144.24.97.120` (Oracle Cloud).
- **OS**: Ubuntu 22.04 LTS.
- **Docker & Docker Compose** installed.

---

## 2. SSH Access & Security (Windows Fix)

If you are using Windows, you may encounter a "Permissions are too open" error when using the SSH key.

### Fix Key Permissions (Windows PowerShell):
Run these commands to ensure only you have access to the key:
```powershell
# Reset permissions
icacls.exe "ssh\ssh-key-2026-03-31.key" /reset

# Grant current user read access
icacls.exe "ssh\ssh-key-2026-03-31.key" /grant:r "$($env:USERNAME):(R)"

# Remove inheritance and all other permissions
icacls.exe "ssh\ssh-key-2026-03-31.key" /inheritance:r
```

### Accessing the Server:
```bash
ssh -i ssh\ssh-key-2026-03-31.key ubuntu@144.24.97.120
```

---

## 3. Synchronizing Changes (Local → Server)

To deploy new code changes, follow this workflow:

### Step A: Push Local Changes to GitHub
```bash
git add .
git commit -m "Describe your changes here"
git push origin main
```

### Step B: Sync and Rebuild on Server
Log into the server and run:
```bash
cd /opt/hrms
sudo git pull origin main
sudo docker-compose up -d --build
```
*Note: `--build` ensures that any changes to the code are captured in new container images.*

---

## 4. Environment Secrets (.env)

The server requires sensitive environment variables that are **not** stored in Git. If you change them locally, you must sync them to the server.

### Sync .env from Local to Server:
```powershell
scp -i ssh\ssh-key-2026-03-31.key backend\.env.production ubuntu@144.24.97.120:/opt/hrms/backend/.env.production
```

### Server Path:
The variables are loaded from `/opt/hrms/backend/.env.production`.

---

## 5. Database & Maintenance Scripts

All database operations are performed inside the `api` container.

### Run Database Migrations:
If you added new tables or columns, run:
```bash
sudo docker-compose exec api alembic upgrade head
```

### Clear Attendance Logs (Reset for a new month):
To wipe out attendance data and start fresh:
```bash
# Upload the script if it's new
scp -i ssh\ssh-key-2026-03-31.key backend\app\scripts\clear_attendance_logs.py ubuntu@144.24.97.120:/opt/hrms/backend/app/scripts/

# Run it inside the container
sudo docker-compose exec api python -m app.scripts.clear_attendance_logs
```

### Fix Employee Codes (Standardize to GTPL):
```bash
sudo docker-compose exec api python -m app.scripts.fix_gtppt_codes
```

---

## 6. Monitoring & Health

### View Real-time Logs:
```bash
# Backend / API logs
sudo docker-compose logs -f api

# Nginx / Traffic logs
sudo docker-compose logs -f nginx
```

### Verify API Health:
```bash
curl http://localhost/health
```
Expected Output: `{"status":"healthy","database":"up"}`

---

## 7. Troubleshooting

| Issue | Resolution |
|-------|------------|
| **SSH Permission Denied** | Run the `icacls` commands in Section 2. |
| **Nginx 502 Bad Gateway** | The API container might still be starting. Wait 30s or run `sudo docker-compose restart nginx`. |
| **Changes not showing** | Ensure you ran `git pull` AND `docker-compose up -d --build`. Check frontend logs for build errors. |
| **Aiven DB Connection Error** | Verify your IP `144.24.97.120` is allowlisted in the Aiven Console. |
| **Docker Connection Reset** | If `docker-compose exec` fails with a timeout, try running the command directly using `sudo docker exec -it <container_id> <command>`. |

---
**Maintained by**: Gadiel HRMS Dev Team
**Last Updated**: April 5, 2026
