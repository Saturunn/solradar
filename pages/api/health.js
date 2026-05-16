import { getTelegramStatus } from '../../lib/telegram';

export default async function handler(req, res) {
  const telegramStatus = getTelegramStatus();
  const hasBirdeyeKey = Boolean(process.env.BIRDEYE_API_KEY);

  // Quick Birdeye connectivity check
  let birdeyeReachable = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const testRes = await fetch('https://public-api.birdeye.so/defi/token_trending?limit=1', {
      headers: {
        'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
        'x-chain': 'solana',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    birdeyeReachable = testRes.ok;
  } catch (_) {
    birdeyeReachable = false;
  }

  const status = {
    status: birdeyeReachable ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.floor(process.uptime()) : null,
    services: {
      birdeye: {
        configured: hasBirdeyeKey,
        reachable: birdeyeReachable,
      },
      telegram: {
        botConfigured: telegramStatus.hasBotToken,
        chatConfigured: telegramStatus.hasChatId,
        webhookReady: telegramStatus.hasSetupSecret && telegramStatus.hasPublicAppUrl,
      },
    },
    endpoints: [
      '/api/trending',
      '/api/new-listings',
      '/api/token',
      '/api/price-history',
      '/api/cron-alerts',
      '/api/health',
    ],
    version: '2.0.0',
  };

  res.status(200).json(status);
}
