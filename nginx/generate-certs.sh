#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Gadiel HRMS — TLS certificate setup
#
# Usage:
#   ./nginx/generate-certs.sh              → self-signed (dev / staging)
#   ./nginx/generate-certs.sh letsencrypt  → Let's Encrypt (production)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CERTS_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
DOMAIN="${DOMAIN:-hrms.gadieltechnologies.com}"

mkdir -p "$CERTS_DIR"

if [[ "${1:-}" == "letsencrypt" ]]; then
  # ── Production: Let's Encrypt ────────────────────────────────────────────
  echo "Requesting Let's Encrypt certificate for $DOMAIN ..."
  command -v certbot >/dev/null 2>&1 || { echo "certbot not found. Install with: apt install certbot"; exit 1; }

  certbot certonly --standalone \
    --non-interactive --agree-tos \
    --email admin@gadieltechnologies.com \
    -d "$DOMAIN"

  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/cert.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$CERTS_DIR/key.pem"
  chmod 600 "$CERTS_DIR/key.pem"

  echo ""
  echo "Certificate installed at nginx/certs/"
  echo ""
  echo "Auto-renewal cron (add to /etc/crontab):"
  echo "  0 0,12 * * * root certbot renew --quiet --deploy-hook \\"
  echo "    'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERTS_DIR/cert.pem && \\"
  echo "     cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERTS_DIR/key.pem && \\"
  echo "     docker compose -f $(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml restart nginx'"

else
  # ── Development / Staging: self-signed ───────────────────────────────────
  echo "Generating self-signed certificate for $DOMAIN (valid 365 days) ..."
  command -v openssl >/dev/null 2>&1 || { echo "openssl not found. Install with: apt install openssl"; exit 1; }

  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$CERTS_DIR/key.pem" \
    -out    "$CERTS_DIR/cert.pem" \
    -subj "/C=IN/ST=Delhi/L=Noida/O=Gadiel Technologies Pvt Ltd/CN=$DOMAIN"

  chmod 600 "$CERTS_DIR/key.pem"

  echo ""
  echo "Self-signed certificate generated at nginx/certs/"
  echo "  cert.pem  — certificate (share with nginx)"
  echo "  key.pem   — private key  (keep secret)"
  echo ""
  echo "NOTE: Browsers will show a warning for self-signed certs."
  echo "      For production run:  ./nginx/generate-certs.sh letsencrypt"
fi
