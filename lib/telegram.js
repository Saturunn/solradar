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
  { command: 'compare', description: 'Compare two tokens' },
  { command: 'top', description: 'Top 3 tokens by volume' },
  { command: 'help', description: 'Show command list' },
];

const START_MESSAGE = [
  '📡 Welcome to SolRadar.',
  '',
  'SolRadar helps you watch Solana tokens from Birdeye, check simple risk signals, and receive breakout alerts.',
  '',
  '🔧 Commands:',
  '/trending - see top trending tokens',
  '/new - see latest new listings',
  '/safe - see safer trending candidates',
  '/token <address> - check one token risk',
  '/compare <addr1> <addr2> - compare two tokens',
  '/top - top 3 tokens by volume',
  '/help - show command guide',
  '',
  '💡 Tip: Paste any Solana address directly and I will auto-lookup the token for you!',
  '',
  '⏰ Alert rule:',
  'I send alerts when a trending token has risk score >= 60, 24h change > 20%, and has not alerted in the last hour.',
  '',
  '🌐 Dashboard:',
  process.env.PUBLIC_APP_URL || 'https://solradar-plum.vercel.app',
].join('\n');

const HELP_MESSAGE = [
  '📡 SolRadar commands',
  '',
  '/start - bot overview',
  '/trending - top trending Solana tokens',
  '/new - latest new listings',
  '/safe - safer trending candidates',
  '/token <address> - check one token',
  '/compare <addr1> <addr2> - compare two tokens',
  '/top - top 3 tokens by 24h volume',
  '/help - show this menu',
  '',
  '💡 Tip: Just paste a token address directly!',
  '',
  'Example /compare:',
  '/compare So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
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
24h Change: ${Number(token.price24hChangePercent || token.priceChange24hPercent || 0).toFixed(2)}%

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
  const change = Number(token.price24hChangePercent || token.priceChange24hPercent || 0).toFixed(2);
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
        `24h Change: ${Number(overview?.priceChange24hPercent || overview?.price24hChangePercent || 0).toFixed(2)}%`,
        `Liquidity: $${Number(overview?.liquidity || 0).toLocaleString()}`,
        `Flags: ${riskScore.flags.length ? riskScore.flags.join(', ') : 'None'}`,
        `Birdeye: https://birdeye.so/token/${address}?chain=solana`,
        '',
        '⚠️ Risk scores are simple heuristic checks, not financial advice. Always DYOR.',
      ].join('\n')
    );

    return { handled: true, command: 'token' };
  });
}

async function replyCompare(chatId, addr1, addr2) {
  if (!addr1 || !addr2) {
    await sendTelegramMessage(chatId, 'Usage: /compare TOKEN_ADDRESS_1 TOKEN_ADDRESS_2');
    return { handled: true, command: 'compare_usage' };
  }

  if (!SOLANA_ADDRESS_PATTERN.test(addr1) || !SOLANA_ADDRESS_PATTERN.test(addr2)) {
    await sendTelegramMessage(chatId, 'Invalid address format. Both must be valid Solana token addresses.');
    return { handled: true, command: 'compare_invalid' };
  }

  return withBirdeyeFallback(chatId, async () => {
    // Fetch sequentially with small delays to avoid rate limits
    let ov1 = null, sec1 = null, ov2 = null, sec2 = null;
    try {
      ov1 = await getTokenOverview(addr1);
    } catch (_) {}
    try {
      sec1 = await getTokenSecurity(addr1);
    } catch (_) {}

    // Small delay between token lookups
    await new Promise(r => setTimeout(r, 300));

    try {
      ov2 = await getTokenOverview(addr2);
    } catch (_) {}
    try {
      sec2 = await getTokenSecurity(addr2);
    } catch (_) {}

    const risk1 = calculateRiskScore(sec1);
    const risk2 = calculateRiskScore(sec2);

    const name1 = ov1?.symbol || `${addr1.slice(0,6)}...`;
    const name2 = ov2?.symbol || `${addr2.slice(0,6)}...`;
    const price1 = Number(ov1?.price || 0);
    const price2 = Number(ov2?.price || 0);
    const vol1 = Number(ov1?.v24hUSD || ov1?.volume24hUSD || 0);
    const vol2 = Number(ov2?.v24hUSD || ov2?.volume24hUSD || 0);
    const chg1 = Number(ov1?.priceChange24hPercent || ov1?.price24hChangePercent || 0);
    const chg2 = Number(ov2?.priceChange24hPercent || ov2?.price24hChangePercent || 0);
    const liq1 = Number(ov1?.liquidity || 0);
    const liq2 = Number(ov2?.liquidity || 0);

    const lines = [
      `📊 ${name1} vs ${name2}`,
      '',
      `  ${name1}`,
      `  Risk: ${risk1.label} (${risk1.score ?? 'N/A'}/100)`,
      `  Price: $${price1.toFixed(8)}`,
      `  24h: ${chg1 >= 0 ? '+' : ''}${chg1.toFixed(2)}%`,
      `  Vol: $${vol1.toLocaleString()}`,
      `  Liq: $${liq1.toLocaleString()}`,
      `  Flags: ${risk1.flags.length ? risk1.flags.join(', ') : 'None'}`,
      '',
      `  ${name2}`,
      `  Risk: ${risk2.label} (${risk2.score ?? 'N/A'}/100)`,
      `  Price: $${price2.toFixed(8)}`,
      `  24h: ${chg2 >= 0 ? '+' : ''}${chg2.toFixed(2)}%`,
      `  Vol: $${vol2.toLocaleString()}`,
      `  Liq: $${liq2.toLocaleString()}`,
      `  Flags: ${risk2.flags.length ? risk2.flags.join(', ') : 'None'}`,
      '',
      `Verdict: ${(risk1.score ?? 0) >= (risk2.score ?? 0) ? name1 : name2} scores higher on safety.`,
      '',
      '⚠️ Risk scores are simple heuristic checks, not financial advice. Always DYOR.',
    ];

    await sendTelegramMessage(chatId, lines.join('\n'));
    return { handled: true, command: 'compare' };
  });
}

async function replyTop(chatId) {
  return withBirdeyeFallback(chatId, async () => {
    const tokens = await getTrendingTokens(20);
    const sorted = [...tokens].sort(
      (a, b) => Number(b.volume24hUSD || 0) - Number(a.volume24hUSD || 0)
    );
    const top3 = sorted.slice(0, 3);

    const lines = ['🏆 Top 3 Tokens by 24h Volume', ''];

    for (let i = 0; i < top3.length; i++) {
      const t = top3[i];
      let risk = { label: 'N/A', score: null, flags: [] };
      try {
        const security = await getTokenSecurity(t.address);
        risk = calculateRiskScore(security, t);
      } catch (_) {}
      const change = Number(t.price24hChangePercent || t.priceChange24hPercent || 0);
      const vol = Number(t.volume24hUSD || 0);

      lines.push(
        `${i + 1}. ${t.symbol || 'Unknown'}`,
        `   Price: $${Number(t.price || 0).toFixed(8)}`,
        `   Volume: $${vol.toLocaleString()}`,
        `   24h: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        `   Risk: ${risk.label} ${risk.score ?? 'N/A'}/100`,
        `   ${t.address}`,
        ''
      );
    }

    lines.push('⚠️ Not financial advice. Always DYOR.');
    await sendTelegramMessage(chatId, lines.join('\n'));
    return { handled: true, command: 'top' };
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

    if (command === '/compare') {
      return await replyCompare(chatId, args[0], args[1]);
    }

    if (command === '/top') {
      return await replyTop(chatId);
    }

    if (command === '/chatid' || command === '/status') {
      await sendTelegramMessage(chatId, 'This command is not available. Use /help to see the supported SolRadar commands.');
      return { handled: true, command: 'disabled' };
    }

    if (command.startsWith('/')) {
      await sendTelegramMessage(chatId, 'Unsupported command. Use /help to see the supported SolRadar commands.');
      return { handled: true, command: 'unknown' };
    }

    // Auto-detect: if user pastes a Solana address directly, auto-lookup
    const words = text.split(/\s+/);
    if (words.length === 1 && SOLANA_ADDRESS_PATTERN.test(words[0])) {
      return await replyTokenLookup(chatId, words[0]);
    }

    // Auto-detect: if user pastes two addresses, auto-compare
    if (words.length === 2 && SOLANA_ADDRESS_PATTERN.test(words[0]) && SOLANA_ADDRESS_PATTERN.test(words[1])) {
      return await replyCompare(chatId, words[0], words[1]);
    }

    await sendTelegramMessage(chatId, '💡 Tip: Paste a Solana token address directly and I will look it up!\n\nUse /help to see all commands.');
    return { handled: true, command: 'fallback' };
  } catch (error) {
    console.error('Telegram command error:', error.message);
    await sendTelegramMessage(chatId, 'The bot hit a temporary error. Try again in a moment.');
    return { handled: true, command: 'error' };
  }
}
