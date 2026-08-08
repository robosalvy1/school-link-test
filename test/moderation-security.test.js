import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSecurityEvent,
  getModeratorQueueItem,
} from '../src/moderation/security.js';

test('flags a rapid failed-login burst as high severity without exposing private content', () => {
  const event = createSecurityEvent({
    type: 'login.failed_burst',
    actorId: 'student-42',
    screen: 'signin',
    occurredAt: '2026-07-29T12:00:00.000Z',
    metadata: { attemptCount: 8, messageBody: 'private content must not leak' },
  });

  assert.equal(event.severity, 'high');
  assert.equal(event.status, 'open');
  assert.deepEqual(event.metadata, { attemptCount: 8 });
});

test('builds a minimal moderator queue item from a suspicious event', () => {
  const event = createSecurityEvent({
    type: 'upload.rejected',
    actorId: 'student-9',
    screen: 'chat-media',
    occurredAt: '2026-07-29T12:01:00.000Z',
    metadata: { reason: 'unsupported_type', originalFilename: 'payload.exe' },
  });

  assert.deepEqual(getModeratorQueueItem(event), {
    eventId: event.id,
    type: 'upload.rejected',
    severity: 'medium',
    status: 'open',
    screen: 'chat-media',
    occurredAt: '2026-07-29T12:01:00.000Z',
    summary: 'Blocked an unsupported upload type.',
  });
});
