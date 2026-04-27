import TelegramBot from 'node-telegram-bot-api';

let bot = null;

export function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  return bot;
}

export function getTelegramStatus() {
  return {
    hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    hasWebhookSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  };
}

export async function sendTelegramMessage(chatId, message, options = {}) {
  const b = getBot();
  if (!b || !chatId) return false;

  try {
    await b.sendMessage(chatId, message, options);
    return true;
  } catch (e) {
    console.error('Telegram error:', e.message);
    return false;
  }
}

export async function sendTelegramAlert(token, riskScore) {
  if (!process.env.TELEGRAM_CHAT_ID) return false;

  const label = riskScore.label || 'N/A';
  const msg = `
SolRadar Alert

${token.name || 'Unknown'} (${token.symbol || '?'})
Risk: ${label} (${riskScore.score}/100)

Price: $${Number(token.price || 0).toFixed(8)}
24h Vol: $${Number(token.volume24hUSD || 0).toLocaleString()}
24h Change: ${Number(token.priceChange24hPercent || 0).toFixed(2)}%

Flags: ${riskScore.flags.length ? riskScore.flags.join(', ') : 'None'}
Birdeye: https://birdeye.so/token/${token.address}
  `.trim();

  return sendTelegramMessage(process.env.TELEGRAM_CHAT_ID, msg);
}

export async function handleTelegramUpdate(update) {
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = typeof message?.text === 'string' ? message.text.trim() : '';

  if (!chatId || !text) {
    return { handled: false };
  }

  if (text === '/start' || text.startsWith('/start ')) {
    await sendTelegramMessage(
      chatId,
      [
        'SolRadar is online.',
        '',
        'I send alerts when trending Solana tokens pass the risk filter and move more than 20% in 24h.',
        '',
        'Commands:',
        '/status - check bot configuration',
        '/chatid - show this chat id',
        '/help - show commands',
      ].join('\n')
    );

    return { handled: true, command: 'start' };
  }

  if (text === '/help') {
    await sendTelegramMessage(
      chatId,
      [
        'SolRadar commands:',
        '/start - intro',
        '/status - config check',
        '/chatid - show this chat id',
      ].join('\n')
    );

    return { handled: true, command: 'help' };
  }

  if (text === '/status') {
    const status = getTelegramStatus();

    await sendTelegramMessage(
      chatId,
      [
        'SolRadar status',
        `Bot token: ${status.hasBotToken ? 'configured' : 'missing'}`,
        `Alert chat id: ${status.hasChatId ? 'configured' : 'missing'}`,
        `Webhook secret: ${status.hasWebhookSecret ? 'configured' : 'not set'}`,
        `This chat id: ${chatId}`,
      ].join('\n')
    );

    return { handled: true, command: 'status' };
  }

  if (text === '/chatid') {
    await sendTelegramMessage(chatId, `This chat id is: ${chatId}`);
    return { handled: true, command: 'chatid' };
  }

  return { handled: false };
}
