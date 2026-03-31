import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import (
    ai,
    attendance,
    auth,
    compensation,
    employees,
    leaves,
    notifications,
    profile,
    reports,
    tasks,
)
from app.routers import files as files_router
from app.services.scheduler import shutdown_scheduler, start_scheduler
from app.utils.limiter import limiter
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001 — required by FastAPI lifespan protocol
    logger.info(f"{settings.APP_NAME} API starting", env=settings.APP_ENV)
    start_scheduler()
    yield
    logger.info("Shutting down...")
    shutdown_scheduler()


_IS_PROD = settings.APP_ENV == "production"

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="HRMS Backend — Mobile & Web Ready",
    version="1.0.0",
    # Swagger/ReDoc are disabled in production to avoid exposing API surface
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    openapi_url=None if _IS_PROD else "/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded. Please try again later."},
    )

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Debug middleware to log origins
@app.middleware("http")
async def log_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    host = request.headers.get("host")
    logger.info(f"Incoming request: host={host}, origin={origin}, path={request.url.path}")
    response = await call_next(request)
    return response

# In development, allow any localhost port so Vite/RN metro port changes never
# cause CORS failures (3000, 3001, 5173, 19000, 19006, …).
# In production, only the explicit origins from CORS_ORIGINS are accepted.
# In production, ensure the current server IP and host are permitted
# Some browsers send the IP, some send nothing for same-origin
_PROD_ORIGINS = settings.cors_origins_list
if _IS_PROD:
    # Explicitly permit the server's public IP
    _PROD_ORIGINS.extend([
        "http://144.24.97.120", 
        "http://144.24.97.120:80",
        "144.24.97.120"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_PROD_ORIGINS if _IS_PROD else [],
    allow_origin_regex=None if _IS_PROD else r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# ── Static file mounts (non-sensitive public assets only) ─────────────────────
# Avatars and ghibli/dashboard images are public — no auth needed.
# Payslips are served via /api/v1/files/payslips/{filename} (requires auth).
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_UPLOADS_DIR = os.path.join(_BACKEND_ROOT, "uploads")
for subdir in ("avatars", "ghibli"):
    os.makedirs(os.path.join(_UPLOADS_DIR, subdir), exist_ok=True)

app.mount("/uploads/avatars", StaticFiles(directory=os.path.join(_UPLOADS_DIR, "avatars")), name="avatars")
app.mount("/uploads/ghibli",  StaticFiles(directory=os.path.join(_UPLOADS_DIR, "ghibli")),  name="ghibli")

# ── API routers ────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=API_PREFIX)
app.include_router(employees.router,     prefix=API_PREFIX)
app.include_router(leaves.router,        prefix=API_PREFIX)
app.include_router(attendance.router,    prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(profile.router,       prefix=API_PREFIX)
app.include_router(ai.router,            prefix=API_PREFIX)
app.include_router(tasks.router,         prefix=API_PREFIX)
app.include_router(compensation.router,  prefix=API_PREFIX)
app.include_router(reports.router,       prefix=API_PREFIX)
app.include_router(files_router.router,  prefix=API_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


@app.get("/health", tags=["Health"])
async def health():
    """Liveness probe. Returns 200 if DB is reachable, 503 otherwise.
    Error details are logged server-side only — never returned to the client."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "up"}
    except Exception:
        logger.error("Health check DB connection failed", exc_info=True)
        from fastapi import Response
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "down"},
        )
