import { getBot, getTelegramStatus, registerTelegramCommands, TELEGRAM_COMMANDS } from '../../lib/telegram';

function getBaseUrl(req) {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const host = req.headers.host;
  if (!host || host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return null;
  }

  return `https://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

  const baseUrl = getBaseUrl(req);
  if (!baseUrl) {
    return res.status(400).json({
      success: false,
      error: 'Set PUBLIC_APP_URL to your public HTTPS app URL before registering the Telegram webhook.',
      status,
    });
  }

  const webhookUrl = `${baseUrl}/api/telegram-webhook`;
  const options = {
    allowed_updates: ['message'],
    drop_pending_updates: true,
  };

  try {
    await bot.deleteWebHook({ drop_pending_updates: true });
    await bot.setWebHook(webhookUrl, options);
    await registerTelegramCommands(bot);
    const webhookInfo = await bot.getWebHookInfo();

    return res.status(200).json({
      success: true,
      webhookUrl,
      commands: TELEGRAM_COMMANDS,
      webhookInfo,
      status,
    });
  } catch (error) {
    console.error('Telegram setup error:', error.message);
    return res.status(500).json({ success: false, error: error.message, status });
  }
}
