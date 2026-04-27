import { handleTelegramUpdate } from '../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
  }

  try {
    const result = await handleTelegramUpdate(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Telegram webhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
