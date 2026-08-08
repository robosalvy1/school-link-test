const EVENT_POLICIES = {
  'login.failed_burst': {
    severity: 'high',
    allowedMetadata: ['attemptCount'],
    summary: 'Detected repeated failed sign-in attempts.',
  },
  'upload.rejected': {
    severity: 'medium',
    allowedMetadata: ['reason'],
    summary: 'Blocked an unsupported upload type.',
  },
};

function policyFor(type) {
  return EVENT_POLICIES[type] ?? {
    severity: 'low',
    allowedMetadata: [],
    summary: 'Recorded a security event for review.',
  };
}

function sanitizeMetadata(metadata, allowedKeys) {
  return Object.fromEntries(
    allowedKeys
      .filter((key) => Object.hasOwn(metadata ?? {}, key))
      .map((key) => [key, metadata[key]]),
  );
}

export function createSecurityEvent({ type, actorId, screen, occurredAt, metadata = {} }) {
  const policy = policyFor(type);

  return {
    id: `${type}:${occurredAt}:${actorId}`,
    type,
    actorId,
    screen,
    occurredAt,
    severity: policy.severity,
    status: 'open',
    metadata: sanitizeMetadata(metadata, policy.allowedMetadata),
  };
}

export function getModeratorQueueItem(event) {
  const policy = policyFor(event.type);

  return {
    eventId: event.id,
    type: event.type,
    severity: event.severity,
    status: event.status,
    screen: event.screen,
    occurredAt: event.occurredAt,
    summary: policy.summary,
  };
}
