import { handleTelegramUpdate } from '../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleTelegramUpdate(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Telegram webhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
