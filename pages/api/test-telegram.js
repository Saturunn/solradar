import { getTelegramStatus, sendTelegramMessage } from '../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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
