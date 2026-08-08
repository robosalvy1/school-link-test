# School Link API deployment foundation

This directory deploys the API and PostgreSQL on a Linux host. The React frontend stays on a static host and calls `https://api.example.edu`; `CORS_ORIGINS` is the exact, comma-separated list of allowed frontend origins.

## What is implemented

- HTTPS reverse proxy, non-root read-only API container, private PostgreSQL container, durable database volume, and health checks.
- Fail-fast configuration validation, explicit CORS allowlist, request IDs, no-store API responses, rate limits, and POST origin checks.
- Email/password sign-up and sign-in with no school-domain restriction. Passwords are salted and hashed with scrypt; sessions are opaque, hashed in PostgreSQL, expire after a configured TTL, and use HttpOnly cookies.
- `/api/v1/health` (liveness), `/api/v1/ready` (database readiness), and `/api/v1/session` for the current authenticated user.
- Idempotent migrations for users, channels, channel membership, messages, products, orders, order items, and audit logging.

## Deploy

1. Copy `.env.example` to `.env`, replace every placeholder, set the real HTTPS frontend origin and a DNS-resolvable `API_DOMAIN`.
2. Keep `.env` readable only by the deployment user (`chmod 600 .env`) and do not commit it.
3. From this directory run `docker compose -f docker-compose.production.yml up -d --build`.
4. Verify `curl -fsS https://YOUR_API_DOMAIN/api/v1/health` and `/api/v1/ready`; monitor logs and take encrypted off-host PostgreSQL backups before handling real student data.

The database is intentionally not published to the host network. Firewall the Linux host to inbound 80/443 and SSH from trusted administration networks only.

## Deliberate boundaries before launch

This is not yet a student-data production service. Local email/password accounts do not include email verification, password reset, breach-password screening, MFA, account recovery, or an identity-provider integration. Add those controls, role/tenant authorization to every data route, uploads and malware scanning, payments, WebRTC/TURN, retention/deletion workflows, backups, observability, incident response, and FERPA/COPPA/security review before accepting real student data.

## Development checks

Install server dependencies with `npm --prefix server install`, then run `npm --prefix server test`. `docker compose ... config` validates the deployment manifest without starting services.
