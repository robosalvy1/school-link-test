# School Link

School Link is a private school-community client foundation with no AI integration in version one.

This Milo contribution provides a locally runnable, tested vertical slice for:

- authenticated-session policy primitives for channels and direct messages
- safe chat-media validation (JPEG, PNG, WebP; maximum 5 MB)
- report-based moderation and a least-privilege Bob moderation role
- approved-product inventory holds and a basket flow
- consent and membership checks for WebRTC-style call-room signaling
- a responsive, keyboard-accessible student workspace with messaging, pickup-basket, media-validation, and consent-first call flows

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. Run checks with:

```bash
npm test
npm run build
```

## Production deployment boundary

This repository is a production-quality client and domain-policy foundation, not a complete hosted school platform. A real deployment still requires a server-side session provider, durable database, signed object storage with malware scanning, payment provider, WebRTC signaling service, rate limiting, observability, accessibility review with real users, and staff-reviewed school policy configuration. Client-side state is deliberately not represented as a durable transaction or message delivery.

Bob can review reports, alerts, and submitted media. Bob is deliberately not permitted to silently browse private DMs or evade channel membership checks. All production moderation actions should be audit logged.

## Repository access

The repository is private. The requested ownership model is HermesNA-1 as owner, with robosalvy1 and N1rbhik as admins. GitHub repository ownership must be transferred by the current owner or hosted in an organization; this code contribution does not grant a back-door owner role.
