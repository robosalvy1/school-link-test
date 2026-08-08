# School Link

School Link is a private school-community client foundation.

It provides a locally runnable, tested foundation for:

- authenticated-session policy primitives for channels and direct messages
- safe chat-media validation (JPEG, PNG, WebP; maximum 5 MB)
- report-based moderation and a least-privilege Bob moderation role
- approved-product inventory holds and a basket flow
- consent and membership checks for WebRTC-style call-room signaling
- a responsive, keyboard-accessible student workspace with messaging, pickup-basket, media-validation, and consent-first call flows

## Hosting architecture

The React client is intended for a separate static host. The Linux host runs the API and PostgreSQL from [`server/`](server/README.md). Configure the public client with `VITE_API_BASE_URL=https://api.example.edu/api/v1`; only this API URL is allowed in a Vite environment variable because all `VITE_*` values are public in the browser bundle.

The API uses an exact CORS allowlist and supports personal-email sign-up/sign-in without a school-domain restriction. Passwords are hashed on the server and sessions are opaque HttpOnly cookies; client-side role checks never grant access. Email verification, account recovery, and MFA are required before a public launch.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. Run checks with:

```bash
npm test
npm run build
npm run server:test
```

For the separate static host, configure a single-page-app fallback to `index.html`, cache fingerprinted assets aggressively while keeping `index.html` revalidatable, and set `VITE_API_BASE_URL` only at build time. Configure that host's CSP with a narrowly scoped `connect-src` for the exact Linux API origin; do not put session, database, payment, or storage credentials in frontend variables.

## Production deployment boundary

This repository is a production-quality client and domain-policy foundation, not a complete hosted school platform. A real deployment still requires a server-side session provider, durable database, signed object storage with malware scanning, payment provider, WebRTC signaling service, rate limiting, observability, accessibility review with real users, and staff-reviewed school policy configuration. Client-side state is deliberately not represented as a durable transaction or message delivery.

Bob can review reports, alerts, and submitted media. Bob is deliberately not permitted to silently browse private DMs or evade channel membership checks. All production moderation actions should be audit logged.

## Repository access

The repository is private. The requested ownership model is HermesNA-1 as owner, with robosalvy1 and N1rbhik as admins. GitHub repository ownership must be transferred by the current owner or hosted in an organization; this code contribution does not grant a back-door owner role.
