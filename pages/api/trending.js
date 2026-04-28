import { getTrendingTokens, getTokenSecurity, calculateRiskScore } from '../../lib/birdeye';
import { sendTelegramAlert } from '../../lib/telegram';
import {
  checkRateLimitWindow,
  getCachedResponse,
  getStaleCachedResponse,
  setCachedResponse,
  shouldSendAlert,
  markAlertSent,
} from '../../lib/request-control';

export default async function handler(req, res) {
  const rateLimit = checkRateLimitWindow(req, 'trending', 2500);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    const stale = getStaleCachedResponse('trending:limit=20');
    if (stale) {
      return res.status(200).json({
        ...stale,
        stale: true,
        warning: 'Showing cached trending data while refresh is cooling down.',
      });
    }

    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again in a few seconds.' });
  }

  const cacheKey = 'trending:limit=20';
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const tokens = await getTrendingTokens(20);

    // Enrich top 5 with security data and send alerts for safe/caution ones
    const enriched = await Promise.all(
      tokens.slice(0, 10).map(async (token) => {
        const security = await getTokenSecurity(token.address);
        const riskScore = calculateRiskScore(security);

        // Send Telegram alert for tokens with good scores breaking out
        if (riskScore.score >= 60 && token.priceChange24hPercent > 20 && shouldSendAlert(token.address)) {
          const sent = await sendTelegramAlert(token, riskScore);
          if (sent) {
            markAlertSent(token.address);
          }
        }

        return { ...token, security, riskScore };
      })
    );

    // Return enriched + rest without security
    const rest = tokens.slice(10).map(t => ({ ...t, riskScore: { score: null, label: 'N/A', color: 'gray', flags: [] } }));

    const payload = { success: true, data: [...enriched, ...rest] };
    setCachedResponse(cacheKey, payload);

    res.status(200).json(payload);
  } catch (error) {
    const stale = getStaleCachedResponse(cacheKey);
    if (stale) {
      return res.status(200).json({
        ...stale,
        stale: true,
        warning: 'Showing cached trending data because Birdeye is temporarily unavailable.',
      });
    }

    res.status(502).json({ success: false, data: [], error: 'Trending data is temporarily unavailable.' });
  }
}
