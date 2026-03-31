# Gadiel HRMS — Deployment Guide

## Live Server
- **URL:** http://144.24.97.120
- **Server:** Oracle Cloud Free Tier (AMD shape, Ubuntu 22.04 LTS, ap-mumbai-1)
- **Database:** Aiven MySQL 8 (managed, hosted on DigitalOcean Mumbai)
- **Cache / Token Blacklist:** Upstash Redis (AWS Mumbai, Free Tier)

---

## Architecture

```
Browser / Mobile App
        │
        ▼
  Nginx (port 80)          ← reverse proxy
   ├── /           →  Frontend container (React SPA, nginx:alpine)
   ├── /api/       →  API container (FastAPI, port 8001)
   └── /health     →  API health probe
        │
        ├── Aiven MySQL   (external — SSL required)
        └── Upstash Redis (external — TLS required)
```

All services run via Docker Compose on the Oracle server.

---

## Services & Ports

| Service  | Container        | Port       | Notes                        |
|----------|-----------------|------------|------------------------------|
| Nginx    | hrms-nginx-1    | 80 (public)| Reverse proxy                |
| API      | hrms-api-1      | 8001       | FastAPI + Uvicorn (2 workers)|
| Frontend | hrms-frontend-1 | 80 (internal)| React SPA served by nginx  |
| MySQL    | Aiven (external)| 22469      | SSL required, IP allowlisted |
| Redis    | Upstash (external)| 6379     | TLS (rediss://)              |

---

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production orchestration (no local MySQL/Redis) |
| `backend/.env.production` | All secrets — gitignored, copy to server manually |
| `backend/.env.production.example` | Template for reference |
| `nginx/nginx.http.conf` | HTTP-only nginx config (current — no domain yet) |
| `nginx/nginx.conf` | Full HTTPS config (use when domain is ready) |
| `nginx/generate-certs.sh` | Script to get Let's Encrypt or self-signed certs |
| `secrets/firebase-credentials.json` | Firebase service account — gitignored |
| `secrets/firebase-credentials.json.example` | Template |

---

## Environment Variables (backend/.env.production)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Aiven MySQL connection string (aiomysql + ssl=true) |
| `REDIS_URL` | Upstash Redis URL (rediss://) |
| `JWT_SECRET_KEY` | Random 64-char hex — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ENCRYPTION_KEY` | Fernet key — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `GROQ_API_KEY` | Groq API key — AI chat uses llama-3.3-70b-versatile (no Anthropic key needed) |
| `CORS_ORIGINS` | Comma-separated allowed origins (use server IP until domain is ready) |
| `FIREBASE_CREDENTIALS_PATH` | `/app/secrets/firebase-credentials.json` (container path) |

---

## SSL / Database Notes

### Aiven MySQL SSL Fix
`aiomysql` does not accept `?ssl=true` as a string in the URL.
Both `backend/app/database.py` and `backend/alembic/env.py` strip `?ssl=true` from the URL
and build a proper `ssl.SSLContext` passed via `connect_args`.

### Upstash Redis TLS
Use the `rediss://` URL (double-s) from the Upstash console Details tab.

### Aiven IP Allowlist
The Oracle server IP (`144.24.97.120/32`) must be added to:
Aiven Console → MySQL service → Overview → IP Allow-List

---

## Initial Deployment Steps (what we did)

### 1. Server Setup
```bash
sudo apt update && sudo apt install -y docker.io git iptables-persistent
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ubuntu

# Open ports
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8001 -j ACCEPT
sudo netfilter-persistent save
```

### 2. Clone & Configure
```bash
git clone https://github.com/UTarsh/Gadiel_HRMS.git /opt/hrms
cd /opt/hrms
```

Copy secrets from local machine:
```powershell
scp -i ssh\ssh-key-2026-03-31.key backend\.env.production ubuntu@144.24.97.120:/opt/hrms/backend/.env.production
scp -i ssh\ssh-key-2026-03-31.key secrets\firebase-credentials.json ubuntu@144.24.97.120:/opt/hrms/secrets/firebase-credentials.json
```

### 3. Build & Start
```bash
cd /opt/hrms
sudo docker-compose up -d --build
```

### 4. Database Migrations & Seed
```bash
sudo docker-compose exec api alembic upgrade head
sudo docker-compose exec api python -m app.scripts.seed_gadiel
sudo docker-compose exec api python -m app.scripts.apply_gadiel_data
sudo docker-compose exec api python -m app.scripts.seed_holidays_2026
sudo docker-compose exec api python -m app.scripts.init_production
```

---

## SSH Access
```powershell
ssh -i ssh\ssh-key-2026-03-31.key ubuntu@144.24.97.120
```
Private key: `ssh/ssh-key-2026-03-31.key` (gitignored)

---

## Common Operations

### Update the app after a code push
```bash
cd /opt/hrms
git pull
sudo docker-compose up -d --build
```

### View live logs
```bash
sudo docker-compose logs -f api        # backend
sudo docker-compose logs -f nginx      # proxy
sudo docker-compose logs -f frontend   # frontend
```

### Restart a service
```bash
sudo docker-compose restart api
sudo docker-compose restart nginx
```

### Health check
```bash
curl http://localhost/health
# Expected: {"status":"healthy","database":"up"}
```

### Run a new migration
```bash
sudo docker-compose exec api alembic upgrade head
```

---

## Bugs Fixed During Deployment

| Bug | Fix |
|-----|-----|
| `aiomysql` SSL: `'str' has no attribute wrap_bio` | Stripped `?ssl=true` from URL, built real `ssl.SSLContext` in `database.py` and `alembic/env.py` |
| Alembic using raw DATABASE_URL with ssl=true | Fixed `alembic/env.py` to also strip and use SSLContext |
| Aiven `Access Denied` | Added Oracle server IP `144.24.97.120/32` to Aiven IP allowlist |
| `ModuleNotFoundError: holidays` | Added `holidays==0.46` to `requirements.txt` |
| Frontend TypeScript build errors | Fixed `MonthlyReport` type (added `tasks`, `open_tasks`, `completed_tasks`), `NotificationType` (added `birthday`, `work_anniversary`), `OrgChartSection` scope fix |
| Nginx 502 after startup | Restarted nginx after API became healthy |

---

## Upgrading to HTTPS (when domain is ready)

1. Point your domain DNS A record to `144.24.97.120`
2. Run Let's Encrypt:
   ```bash
   bash /opt/hrms/nginx/generate-certs.sh letsencrypt
   ```
3. Update `docker-compose.yml` to use `nginx/nginx.conf` instead of `nginx/nginx.http.conf` and expose port 443
4. Update `CORS_ORIGINS` in `.env.production` to `https://yourdomain.com`
5. Rebuild: `sudo docker-compose up -d --build nginx`

---

## Mobile App

- API URL configured in `mobile/src/api/client.ts`: `https://api.gadielhrms.com/api/v1`
- Update to `http://144.24.97.120/api/v1` for testing until domain is live
- Build APK: `eas build --profile preview --platform android`
- Android package: `com.gadiel.hrms`
