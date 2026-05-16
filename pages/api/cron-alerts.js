import { getTrendingTokens, getTokenSecurity, calculateRiskScore } from '../../lib/birdeye';
import { sendTelegramAlert } from '../../lib/telegram';
import { shouldSendAlert, markAlertSent } from '../../lib/request-control';

// This endpoint is called by Vercel Cron every 5 minutes.
// It scans trending tokens for breakout alerts independently of the dashboard.
export default async function handler(req, res) {
  // Verify cron authorization (Vercel sends this header for cron jobs)
  const authHeader = req.headers['authorization'];
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = req.query.secret === process.env.TELEGRAM_SETUP_SECRET;

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tokens = await getTrendingTokens(10);
    let alertsSent = 0;
    let tokensScanned = 0;

    // Check top tokens sequentially to respect rate limits
    for (const token of tokens.slice(0, 6)) {
      tokensScanned++;

      try {
        const security = await getTokenSecurity(token.address);
        const riskScore = calculateRiskScore(security, token);
        const change = Number(token.priceChange24hPercent || 0);

        if (
          riskScore.score >= 60 &&
          change > 20 &&
          shouldSendAlert(token.address)
        ) {
          const sent = await sendTelegramAlert(token, riskScore);
          if (sent) {
            markAlertSent(token.address);
            alertsSent++;
          }
        }
      } catch (_secErr) {
        // Skip tokens whose security lookup fails
        continue;
      }
    }

    res.status(200).json({
      success: true,
      scanned: tokensScanned,
      alertsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron alert scan failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
