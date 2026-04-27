import TelegramBot from 'node-telegram-bot-api';
import {
  calculateRiskScore,
  getNewListings,
  getTokenOverview,
  getTokenSecurity,
  getTrendingTokens,
} from './birdeye';

let bot = null;

export const TELEGRAM_COMMANDS = [
  { command: 'start', description: 'Start SolRadar bot' },
  { command: 'trending', description: 'Show top trending tokens' },
  { command: 'new', description: 'Show latest new listings' },
  { command: 'safe', description: 'Show safer trending candidates' },
  { command: 'token', description: 'Check token by address' },
  { command: 'status', description: 'Check bot configuration' },
  { command: 'chatid', description: 'Show current chat id' },
  { command: 'help', description: 'Show command list' },
];

const START_MESSAGE = [
  'Welcome to SolRadar.',
  '',
  'SolRadar helps you watch Solana tokens from Birdeye, check simple risk signals, and receive breakout alerts.',
  '',
  'What you can do here:',
  '/trending - see top trending tokens',
  '/new - see latest new listings',
  '/safe - see safer trending candidates',
  '/token <address> - check one token risk',
  '/status - check whether bot config is loaded',
  '/chatid - show this chat id',
  '/help - show command guide',
  '',
  'Alert rule:',
  'I send alerts when a trending token has risk score >= 60, 24h change > 20%, and has not alerted in the last hour.',
  '',
  'Open dashboard:',
  process.env.PUBLIC_APP_URL || 'Dashboard URL is not configured yet.',
].join('\n');

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

export async function registerTelegramCommands(botInstance = getBot()) {
  if (!botInstance) return false;

  await botInstance.setMyCommands(TELEGRAM_COMMANDS);
  return true;
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

function getCommandParts(text) {
  const [rawCommand = '', ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split('@')[0];

  return {
    command,
    args,
  };
}

function formatTokenLine(token, index, riskScore = null) {
  const name = token.symbol || token.name || 'Unknown';
  const change = Number(token.priceChange24hPercent || 0).toFixed(2);
  const volume = Number(token.volume24hUSD || 0).toLocaleString();
  const risk = riskScore?.label ? ` | ${riskScore.label} ${riskScore.score}/100` : '';

  return `${index}. ${name} | ${change}% 24h | Vol $${volume}${risk}`;
}

async function replyTrending(chatId) {
  const tokens = await getTrendingTokens(5);
  const lines = tokens.map((token, index) => formatTokenLine(token, index + 1));

  await sendTelegramMessage(
    chatId,
    [
      'Top trending Solana tokens',
      '',
      lines.length ? lines.join('\n') : 'No trending data available right now.',
      '',
      process.env.PUBLIC_APP_URL ? `Open web: ${process.env.PUBLIC_APP_URL}` : '',
    ].filter(Boolean).join('\n')
  );
}

async function replyNewListings(chatId) {
  const tokens = await getNewListings(5);
  const lines = tokens.map((token, index) => formatTokenLine(token, index + 1));

  await sendTelegramMessage(
    chatId,
    [
      'Latest new listings',
      '',
      lines.length ? lines.join('\n') : 'No new listing data available right now.',
      '',
      process.env.PUBLIC_APP_URL ? `Open web: ${process.env.PUBLIC_APP_URL}` : '',
    ].filter(Boolean).join('\n')
  );
}

async function replySafeCandidates(chatId) {
  const tokens = await getTrendingTokens(10);
  const checked = await Promise.all(
    tokens.slice(0, 8).map(async (token) => {
      const security = await getTokenSecurity(token.address);
      const riskScore = calculateRiskScore(security);
      return { token, riskScore };
    })
  );

  const candidates = checked
    .filter(({ riskScore }) => riskScore.score >= 60)
    .slice(0, 5);

  const lines = candidates.map(({ token, riskScore }, index) => (
    formatTokenLine(token, index + 1, riskScore)
  ));

  await sendTelegramMessage(
    chatId,
    [
      'Safer trending candidates',
      '',
      lines.length ? lines.join('\n') : 'No SAFE/CAUTION candidates found in the current top trending set.',
      '',
      'Filter: risk score >= 60.',
    ].join('\n')
  );
}

async function replyTokenLookup(chatId, address) {
  if (!address) {
    await sendTelegramMessage(chatId, 'Usage: /token TOKEN_ADDRESS');
    return;
  }

  const [overview, security] = await Promise.all([
    getTokenOverview(address),
    getTokenSecurity(address),
  ]);

  if (!overview && !security) {
    await sendTelegramMessage(chatId, 'Token data was not found. Check the address and try again.');
    return;
  }

  const riskScore = calculateRiskScore(security);
  const name = overview?.symbol || overview?.name || 'Unknown';

  await sendTelegramMessage(
    chatId,
    [
      `${name}`,
      `Risk: ${riskScore.label} (${riskScore.score ?? 'N/A'}/100)`,
      `Price: $${Number(overview?.price || 0).toFixed(8)}`,
      `24h Vol: $${Number(overview?.v24hUSD || overview?.volume24hUSD || 0).toLocaleString()}`,
      `24h Change: ${Number(overview?.priceChange24hPercent || 0).toFixed(2)}%`,
      `Flags: ${riskScore.flags.length ? riskScore.flags.join(', ') : 'None'}`,
      `Birdeye: https://birdeye.so/token/${address}`,
    ].join('\n')
  );
}

function getHelpMessage() {
  return [
    'SolRadar commands',
    '',
    '/trending - top trending tokens',
    '/new - latest new listings',
    '/safe - safer trending candidates',
    '/token <address> - check one token',
    '/status - bot configuration status',
    '/chatid - show this chat id',
    '/help - show this menu',
    '',
    'Alerts are sent when a trending token has risk score >= 60, 24h change > 20%, and has not alerted in the last hour.',
  ].join('\n');
}

async function withTyping(chatId, action) {
  const b = getBot();
  if (b) {
    await b.sendChatAction(chatId, 'typing').catch(() => {});
  }

  return action();
}

export async function handleTelegramUpdate(update) {
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = typeof message?.text === 'string' ? message.text.trim() : '';

  if (!chatId || !text) {
    return { handled: false };
  }

  const { command, args } = getCommandParts(text);

  if (command === '/start') {
    await sendTelegramMessage(chatId, START_MESSAGE);

    return { handled: true, command: 'start' };
  }

  if (command === '/help') {
    await sendTelegramMessage(chatId, getHelpMessage());
    return { handled: true, command: 'help' };
  }

  if (command === '/trending') {
    await withTyping(chatId, () => replyTrending(chatId));
    return { handled: true, command: 'trending' };
  }

  if (command === '/new') {
    await withTyping(chatId, () => replyNewListings(chatId));
    return { handled: true, command: 'new' };
  }

  if (command === '/safe') {
    await withTyping(chatId, () => replySafeCandidates(chatId));
    return { handled: true, command: 'safe' };
  }

  if (command === '/token') {
    await withTyping(chatId, () => replyTokenLookup(chatId, args[0]));
    return { handled: true, command: 'token' };
  }

  if (command === '/status') {
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

  if (command === '/chatid') {
    await sendTelegramMessage(chatId, `This chat id is: ${chatId}`);
    return { handled: true, command: 'chatid' };
  }

  if (command.startsWith('/')) {
    await sendTelegramMessage(chatId, 'Unknown command. Send /help to see the SolRadar menu.');
    return { handled: true, command: 'unknown' };
  }

  await sendTelegramMessage(
    chatId,
    [
      'I received your message.',
      '',
      'Use /help to open the SolRadar command guide, or /trending to fetch the current top tokens.',
    ].join('\n')
  );

  return { handled: true, command: 'fallback' };
}
