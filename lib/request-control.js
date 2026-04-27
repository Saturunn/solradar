const RATE_LIMIT_WINDOW_MS = 10 * 1000;
const RESPONSE_CACHE_TTL_MS = 30 * 1000;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

const rateLimitStore = new Map();
const responseCacheStore = new Map();
const alertCooldownStore = new Map();

function pruneExpiredEntries(store, now) {
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(req, keyPrefix = 'global') {
  return checkRateLimitWindow(req, keyPrefix, RATE_LIMIT_WINDOW_MS);
}

export function checkRateLimitWindow(req, keyPrefix = 'global', windowMs = RATE_LIMIT_WINDOW_MS) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;

  pruneExpiredEntries(rateLimitStore, now);

  const existing = rateLimitStore.get(key);
  if (existing && existing.expiresAt > now) {
    return {
      allowed: false,
      retryAfterMs: existing.expiresAt - now,
    };
  }

  rateLimitStore.set(key, { expiresAt: now + windowMs });

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

export function getCachedResponse(key) {
  const now = Date.now();
  const cached = responseCacheStore.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now) {
    responseCacheStore.delete(key);
    return null;
  }

  return cached.value;
}

export function setCachedResponse(key, value, ttlMs = RESPONSE_CACHE_TTL_MS) {
  const now = Date.now();
  pruneExpiredEntries(responseCacheStore, now);

  responseCacheStore.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

export function shouldSendAlert(address) {
  const now = Date.now();
  pruneExpiredEntries(alertCooldownStore, now);

  const existing = alertCooldownStore.get(address);
  if (existing && existing.expiresAt > now) {
    return false;
  }

  return true;
}

export function markAlertSent(address, ttlMs = ALERT_COOLDOWN_MS) {
  const now = Date.now();
  pruneExpiredEntries(alertCooldownStore, now);

  alertCooldownStore.set(address, {
    expiresAt: now + ttlMs,
  });
}

export function getResponseCacheTtlMs() {
  return RESPONSE_CACHE_TTL_MS;
}
