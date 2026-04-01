FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        default-libmysqlclient-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure upload directories exist inside the image
RUN mkdir -p uploads/avatars uploads/ghibli uploads/payslips

EXPOSE 8001

# 2 Uvicorn workers — tune via WEB_CONCURRENCY env var in production
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips='*'"]
