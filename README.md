# School Link Test

School Link Test is a private school-community foundation with no AI integration in version one.

This Milo contribution provides a locally runnable, tested vertical slice for:

- authenticated-session policy primitives for channels and direct messages
- safe chat-media validation (JPEG, PNG, WebP; maximum 5 MB)
- report-based moderation and a least-privilege Bob moderation role
- approved-product inventory holds and a basket flow
- consent and membership checks for WebRTC-style call-room signaling
- a responsive product dashboard that makes these boundaries visible

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

## Version-one implementation boundary

The current repository starts as a front-end demonstration plus domain-policy layer. Production rollout still requires a server-side session provider, durable database, signed object storage with malware scanning, payment provider, a real WebRTC signaling service, rate limiting, and staff-reviewed school policy configuration.

Bob can review reports, alerts, and submitted media. Bob is deliberately not permitted to silently browse private DMs or evade channel membership checks. All production moderation actions should be audit logged.

## Repository access

The repository is private. The requested ownership model is HermesNA-1 as owner, with robosalvy1 and N1rbhik as admins. GitHub repository ownership must be transferred by the current owner or hosted in an organization; this code contribution does not grant a back-door owner role.
