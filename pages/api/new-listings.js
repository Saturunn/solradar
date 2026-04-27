import { getNewListings, getTokenSecurity, calculateRiskScore } from '../../lib/birdeye';
import { checkRateLimit, getCachedResponse, setCachedResponse } from '../../lib/request-control';

export default async function handler(req, res) {
  const rateLimit = checkRateLimit(req, 'new-listings');
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again in 10 seconds.' });
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
    res.status(500).json({ success: false, error: error.message });
  }
}
