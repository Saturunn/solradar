import { getNewListings, getTokenSecurity, calculateRiskScore } from '../../lib/birdeye';
import {
  checkRateLimitWindow,
  getCachedResponse,
  getStaleCachedResponse,
  setCachedResponse,
} from '../../lib/request-control';

export default async function handler(req, res) {
  const rateLimit = checkRateLimitWindow(req, 'new-listings', 2500);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    const stale = getStaleCachedResponse('new-listings:limit=20');
    if (stale) {
      return res.status(200).json({
        ...stale,
        stale: true,
        warning: 'Showing cached new listings while refresh is cooling down.',
      });
    }

    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again in a few seconds.' });
  }

  const cacheKey = 'new-listings:limit=20';
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const tokens = await getNewListings(20);

    const enriched = await Promise.all(
      tokens.slice(0, 10).map(async (token) => {
        const security = await getTokenSecurity(token.address);
        const riskScore = calculateRiskScore(security);
        return { ...token, security, riskScore };
      })
    );

    const rest = tokens.slice(10).map(t => ({
      ...t,
      riskScore: { score: null, label: 'N/A', color: 'gray', flags: [] }
    }));

    const payload = { success: true, data: [...enriched, ...rest] };
    setCachedResponse(cacheKey, payload);

    res.status(200).json(payload);
  } catch (error) {
    const stale = getStaleCachedResponse(cacheKey);
    if (stale) {
      return res.status(200).json({
        ...stale,
        stale: true,
        warning: 'Showing cached new listings because Birdeye is temporarily unavailable.',
      });
    }

    res.status(502).json({ success: false, data: [], error: 'New listing data is temporarily unavailable.' });
  }
}
