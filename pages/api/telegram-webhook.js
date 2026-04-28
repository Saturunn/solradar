import { handleTelegramUpdate } from '../../lib/telegram';
import { checkRateLimitWindow } from '../../lib/request-control';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const rateLimit = checkRateLimitWindow(req, 'telegram-webhook', 1000);
  if (!rateLimit.allowed) {
    return res.status(200).json({ success: true, handled: false, limited: true });
  }

  try {
    const result = await handleTelegramUpdate(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Telegram webhook error:', error.message);
    return res.status(200).json({ success: true, handled: false, error: 'temporary_error' });
  }
}
