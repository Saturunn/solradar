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
  }

  const cacheKey = 'trending:limit=20';
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const tokens = await getTrendingTokens(20);

    // Keep the list available even when individual security lookups fail.
    const enriched = await Promise.all(
      tokens.slice(0, 6).map(async (token) => {
        try {
          const security = await getTokenSecurity(token.address);
          const riskScore = calculateRiskScore(security, token);

          if (riskScore.score >= 60 && token.priceChange24hPercent > 20 && shouldSendAlert(token.address)) {
            const sent = await sendTelegramAlert(token, riskScore);
            if (sent) {
              markAlertSent(token.address);
            }
          }

          return { ...token, security, riskScore };
        } catch (securityError) {
          console.error('Trending token enrichment failed:', token.address, securityError.message);
          return {
            ...token,
            security: null,
            riskScore: { score: null, label: 'N/A', color: 'gray', flags: [] },
          };
        }
      })
    );

    const rest = tokens.slice(6).map(t => ({ ...t, riskScore: { score: null, label: 'N/A', color: 'gray', flags: [] } }));

    const payload = { success: true, data: [...enriched, ...rest] };
    setCachedResponse(cacheKey, payload);

    res.status(200).json(payload);
  } catch (error) {
    console.error('Trending route failed:', error.message, error.details || '');
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
