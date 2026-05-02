import TelegramBot from 'node-telegram-bot-api';
import {
  calculateRiskScore,
  getNewListings,
  getTokenOverview,
  getTokenSecurity,
  getTrendingTokens,
  isBirdeyeApiError,
} from './birdeye';

let bot = null;

export const TELEGRAM_COMMANDS = [
  { command: 'start', description: 'Start SolRadar bot' },
  { command: 'trending', description: 'Show top trending tokens' },
  { command: 'new', description: 'Show latest new listings' },
  { command: 'safe', description: 'Show safer trending candidates' },
  { command: 'token', description: 'Check token by address' },
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
  '/help - show command guide',
  '',
  'Alert rule:',
  'I send alerts when a trending token has risk score >= 60, 24h change > 20%, and has not alerted in the last hour.',
  '',
  'Open dashboard:',
  process.env.PUBLIC_APP_URL || 'https://solradar-plum.vercel.app',
].join('\n');

const HELP_MESSAGE = [
  'SolRadar commands',
  '',
  '/start - bot overview',
  '/trending - top trending Solana tokens',
  '/new - latest new listings',
  '/safe - safer trending candidates',
  '/token <address> - check one token',
  '/help - show this menu',
].join('\n');

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
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

function getCommandParts(text) {
  const [rawCommand = '', ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split('@')[0];

  return { command, args };
}

function formatTokenLine(token, index, riskScore = null) {
  const name = token.symbol || token.name || 'Unknown';
  const change = Number(token.priceChange24hPercent || 0).toFixed(2);
  const volume = Number(token.volume24hUSD || token.volumeUSD || 0).toLocaleString();
  const risk = riskScore?.label ? ` | ${riskScore.label} ${riskScore.score}/100` : '';

  return `${index}. ${name} | ${change}% 24h | Vol $${volume}${risk}`;
}

async function withBirdeyeFallback(chatId, task) {
  try {
    return await task();
  } catch (error) {
    if (isBirdeyeApiError(error)) {
      await sendTelegramMessage(chatId, 'Market data is temporarily unavailable. Try again later.');
      return { handled: true, command: 'upstream_unavailable' };
    }

    throw error;
  }
}

async function replyTrending(chatId) {
  return withBirdeyeFallback(chatId, async () => {
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

    return { handled: true, command: 'trending' };
  });
}

async function replyNewListings(chatId) {
  return withBirdeyeFallback(chatId, async () => {
    let tokens;
    let isFallback = false;

    try {
      tokens = await getNewListings(5);
    } catch (_err) {
      // New listing endpoint may require higher API tier, fall back to trending
      tokens = await getTrendingTokens(5);
      isFallback = true;
    }

    const lines = tokens.map((token, index) => formatTokenLine(token, index + 1));

    await sendTelegramMessage(
      chatId,
      [
        isFallback ? 'Latest trending tokens (new listings feed unavailable)' : 'Latest new listings',
        '',
        lines.length ? lines.join('\n') : 'No data available right now.',
        '',
        process.env.PUBLIC_APP_URL ? `Open web: ${process.env.PUBLIC_APP_URL}` : '',
      ].filter(Boolean).join('\n')
    );

    return { handled: true, command: 'new' };
  });
}

async function replySafeCandidates(chatId) {
  return withBirdeyeFallback(chatId, async () => {
    const tokens = await getTrendingTokens(10);
    const subset = tokens.slice(0, 5);

    // Check security one-by-one to avoid overwhelming the API
    const checked = [];
    for (const token of subset) {
      try {
        const security = await getTokenSecurity(token.address);
        const riskScore = calculateRiskScore(security);
        checked.push({ token, riskScore });
      } catch (_secErr) {
        // Skip tokens whose security lookup fails
        checked.push({ token, riskScore: { score: null, label: 'N/A', color: 'gray', flags: [] } });
      }
    }

    const candidates = checked
      .filter(({ riskScore }) => riskScore.score != null && riskScore.score >= 60)
      .slice(0, 5);

    const lines = candidates.map(({ token, riskScore }, index) => (
      formatTokenLine(token, index + 1, riskScore)
    ));

    await sendTelegramMessage(
      chatId,
      [
        'Safer trending candidates',
        '',
        lines.length ? lines.join('\n') : 'No SAFE or CAUTION candidates found right now.',
        '',
        '⚠️ Risk labels are based on simple on-chain checks (freeze/mint authority, holder concentration). Not financial advice — always DYOR.',
        '',
        process.env.PUBLIC_APP_URL ? `Open web: ${process.env.PUBLIC_APP_URL}` : '',
      ].filter(Boolean).join('\n')
    );

    return { handled: true, command: 'safe' };
  });
}

async function replyTokenLookup(chatId, address) {
  if (!address) {
    await sendTelegramMessage(chatId, 'Usage: /token TOKEN_ADDRESS');
    return { handled: true, command: 'token_usage' };
  }

  if (!SOLANA_ADDRESS_PATTERN.test(address)) {
    await sendTelegramMessage(chatId, 'Invalid token address format. Use /token followed by a Solana token address.');
    return { handled: true, command: 'token_invalid' };
  }

  return withBirdeyeFallback(chatId, async () => {
    const [overview, security] = await Promise.all([
      getTokenOverview(address),
      getTokenSecurity(address),
    ]);

    if (!overview && !security) {
      await sendTelegramMessage(chatId, 'Token data was not found. Check the address and try again.');
      return { handled: true, command: 'token_missing' };
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
        '',
        '⚠️ Risk scores are simple heuristic checks, not financial advice. Always DYOR.',
      ].join('\n')
    );

    return { handled: true, command: 'token' };
  });
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

  const { command, args } = getCommandParts(text);

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

    if (command === '/new') {
      return await replyNewListings(chatId);
    }

    if (command === '/safe') {
      return await replySafeCandidates(chatId);
    }

    if (command === '/token') {
      return await replyTokenLookup(chatId, args[0]);
    }

    if (command === '/chatid' || command === '/status') {
      await sendTelegramMessage(chatId, 'This command is not available. Use /help to see the supported SolRadar commands.');
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
    await sendTelegramMessage(chatId, 'The bot hit a temporary error. Try again in a moment.');
    return { handled: true, command: 'error' };
  }
}
