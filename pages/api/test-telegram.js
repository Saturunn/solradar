import { getTelegramStatus, sendTelegramMessage } from '../../lib/telegram';
import { checkRateLimit } from '../../lib/request-control';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const receivedSecret = req.headers['x-solradar-setup-secret'] || req.query.secret;

  if (setupSecret && receivedSecret !== setupSecret) {
    return res.status(401).json({ success: false, error: 'Invalid setup secret' });
  }

  const rateLimit = checkRateLimit(req, 'test-telegram');
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    return res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
  }

  const status = getTelegramStatus();
  if (!status.hasBotToken || !status.hasChatId) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured.',
      status,
    });
  }

  const sent = await sendTelegramMessage(
    process.env.TELEGRAM_CHAT_ID,
    `SolRadar test alert is working. Time: ${new Date().toISOString()}`
  );

  return res.status(sent ? 200 : 500).json({
    success: sent,
    status,
  });
}
