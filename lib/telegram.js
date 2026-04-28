import TelegramBot from 'node-telegram-bot-api';
import { getTrendingTokens, isBirdeyeApiError } from './birdeye';

let bot = null;

export const TELEGRAM_COMMANDS = [
  { command: 'start', description: 'Start SolRadar bot' },
  { command: 'trending', description: 'Show top trending tokens' },
  { command: 'help', description: 'Show command list' },
];

const START_MESSAGE = [
  'Welcome to SolRadar.',
  '',
  'SolRadar tracks Birdeye trending tokens and sends breakout alerts.',
  '',
  'Available commands:',
  '/trending - see the current top trending tokens',
  '/help - show the command guide',
  '',
  'Open dashboard:',
  process.env.PUBLIC_APP_URL || 'Dashboard URL is not configured yet.',
].join('\n');

const HELP_MESSAGE = [
  'SolRadar commands',
  '',
  '/start - bot overview',
  '/trending - top trending Solana tokens',
  '/help - show this menu',
  '',
  'Alerts are sent when a trending token has risk score >= 60, 24h change > 20%, and has not alerted in the last hour.',
].join('\n');

const MAX_TELEGRAM_TEXT_LENGTH = 200;

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
    hasSetupSecret: Boolean(process.env.TELEGRAM_SETUP_SECRET),
    hasPublicAppUrl: Boolean(process.env.PUBLIC_APP_URL),
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
    await b.sendMessage(chatId, message, { disable_web_page_preview: true, ...options });
    return true;
  } catch (error) {
    console.error('Telegram error:', error.message);
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

function getCommand(text) {
  const rawCommand = text.trim().split(/\s+/)[0] || '';
  return rawCommand.toLowerCase().split('@')[0];
}

function formatTrendingLine(token, index) {
  const name = token.symbol || token.name || 'Unknown';
  const change = Number(token.priceChange24hPercent || 0).toFixed(2);
  const volume = Number(token.volume24hUSD || 0).toLocaleString();

  return `${index}. ${name} | ${change}% 24h | Vol $${volume}`;
}

async function replyTrending(chatId) {
  try {
    const tokens = await getTrendingTokens(5);
    const lines = tokens.map((token, index) => formatTrendingLine(token, index + 1));

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
  } catch (error) {
    if (isBirdeyeApiError(error)) {
      await sendTelegramMessage(chatId, 'Trending data is temporarily unavailable. Try again later.');
      return { handled: true, command: 'trending_unavailable' };
    }

    throw error;
  }

  return { handled: true, command: 'trending' };
}

export async function handleTelegramUpdate(update) {
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = typeof message?.text === 'string'
    ? message.text.trim().slice(0, MAX_TELEGRAM_TEXT_LENGTH)
    : '';

  if (!chatId || !text) {
    return { handled: false };
  }

  const command = getCommand(text);

  try {
    if (command === '/start') {
      await sendTelegramMessage(chatId, START_MESSAGE);
      return { handled: true, command: 'start' };
    }

    if (command === '/help') {
      await sendTelegramMessage(chatId, HELP_MESSAGE);
      return { handled: true, command: 'help' };
    }

    if (command === '/trending') {
      return await replyTrending(chatId);
    }

    if (command === '/chatid' || command === '/status' || command === '/new' || command === '/safe' || command === '/token') {
      await sendTelegramMessage(chatId, 'This command is disabled. Use /help to see the supported SolRadar commands.');
      return { handled: true, command: 'disabled' };
    }

    if (command.startsWith('/')) {
      await sendTelegramMessage(chatId, 'Unsupported command. Use /help to see the supported SolRadar commands.');
      return { handled: true, command: 'unknown' };
    }

    await sendTelegramMessage(chatId, 'Use /help to see the supported SolRadar commands.');
    return { handled: true, command: 'fallback' };
  } catch (error) {
    console.error('Telegram command error:', error.message);
    await sendTelegramMessage(chatId, 'The bot hit a temporary error. Try /trending again in a moment.');
    return { handled: true, command: 'error' };
  }
}
