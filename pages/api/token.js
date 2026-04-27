import { getTokenOverview, getTokenSecurity, calculateRiskScore } from '../../lib/birdeye';
import { checkRateLimit, getCachedResponse, setCachedResponse } from '../../lib/request-control';

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const rateLimit = checkRateLimit(req, 'token');
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again in 10 seconds.' });
  }

  const cacheKey = `token:${address}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const [overview, security] = await Promise.all([
      getTokenOverview(address),
      getTokenSecurity(address),
    ]);

    const riskScore = calculateRiskScore(security);

    const payload = { success: true, data: { overview, security, riskScore } };
    setCachedResponse(cacheKey, payload);

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
