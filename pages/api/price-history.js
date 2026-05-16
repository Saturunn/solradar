import { getTokenPriceHistory } from '../../lib/birdeye';
import { checkRateLimit, getCachedResponse, setCachedResponse } from '../../lib/request-control';

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ success: false, error: 'Address required' });

  const rateLimit = checkRateLimit(req, 'price-history');
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    return res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
  }

  const cacheKey = `priceHistory:${address}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return res.status(200).json(cached);

  try {
    const items = await getTokenPriceHistory(address);

    // Extract just the closing prices for sparkline
    const prices = items.map(item => ({
      time: item.unixTime,
      price: item.value,
    }));

    const payload = { success: true, data: prices };
    setCachedResponse(cacheKey, payload, 60000); // 1 min cache for price data
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
