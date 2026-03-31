# TLS Certificates

Place your TLS certificate files here before starting nginx in production:

```
nginx/certs/cert.pem   ← full-chain certificate
nginx/certs/key.pem    ← private key
```

For a free certificate use [Let's Encrypt](https://letsencrypt.org/) with certbot:

```bash
certbot certonly --standalone -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/certs/key.pem
```

The `certs/` directory is git-ignored — never commit certificate files.
