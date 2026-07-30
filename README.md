# School Link Test

Private school community platform: chat, a school store, photo sharing, voice/video calls, and a protected moderation/security workflow for Bob. AI is explicitly deferred from version one.

## Responsibilities

### Nick — backend, security, and Bob moderation foundation

- Security-event policy and audit model
- Protected Bob moderation queue/API design
- Authorization boundaries, upload validation hooks, and privacy-safe event summaries
- Test harness, CI, architecture documentation, and integration review

### Salvy / Milo (Codex) — user-facing application features

- Responsive web UI and authenticated user journeys
- Chat screens and photo-sharing interface
- Store catalogue, basket, checkout flow, and inventory UI
- Voice/video calling UX and WebRTC signalling integration
- Connect frontend screens to Nick's reviewed backend contracts

## Bob moderation boundary

Bob is a moderator/security role, not an AI assistant. Bob receives reports, suspicious-activity alerts, upload-review items, and audit summaries through a protected moderator dashboard. The role must follow permissions and audit requirements; it must not silently bypass access controls or expose private content.

## Development

```bash
npm test
```

The initial security module deliberately minimizes what reaches the moderator queue. For example, a failed-login burst exposes its attempt count but not submitted content, and a rejected upload exposes its reason but not the original filename.
