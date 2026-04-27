import { getBot, getTelegramStatus } from '../../lib/telegram';

export default async function handler(req, res) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const receivedSecret = req.headers['x-solradar-setup-secret'] || req.query.secret;

  if (setupSecret && receivedSecret !== setupSecret) {
    return res.status(401).json({ success: false, error: 'Invalid setup secret' });
  }

  const bot = getBot();
  const status = getTelegramStatus();

  if (!bot) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN must be configured.',
      status,
    });
  }

  try {
    const webhookInfo = await bot.getWebHookInfo();
    const commands = await bot.getMyCommands();

    return res.status(200).json({
      success: true,
      status,
      webhookInfo,
      commands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      status,
    });
  }
}
