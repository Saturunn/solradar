const BASE_URL = 'https://public-api.birdeye.so';
const REQUEST_TIMEOUT_MS = 8000;

const headers = {
  'X-API-KEY': process.env.BIRDEYE_API_KEY,
  'x-chain': 'solana',
};

class BirdeyeApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BirdeyeApiError';
    this.details = details;
  }
}

async function fetchBirdeyeJson(path) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      throw new BirdeyeApiError(`Birdeye request failed with status ${res.status}.`, {
        status: res.status,
        contentType,
      });
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      throw new BirdeyeApiError('Birdeye returned a non-JSON response.', {
        status: res.status,
        contentType,
      });
    }

    try {
      return await res.json();
    } catch (error) {
      throw new BirdeyeApiError('Birdeye returned malformed JSON.', {
        cause: error.message,
      });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new BirdeyeApiError('Birdeye request timed out.');
    }

    if (error instanceof BirdeyeApiError) {
      throw error;
    }

    throw new BirdeyeApiError(error.message || 'Birdeye request failed.');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getBirdeyeData(path, selector, fallbackValue) {
  const payload = await fetchBirdeyeJson(path);
  const result = selector(payload);
  return result ?? fallbackValue;
}

// GET trending tokens
export async function getTrendingTokens(limit = 20) {
  return getBirdeyeData(
    `/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
    (payload) => payload?.data?.tokens,
    []
  );
}

// GET new listings
export async function getNewListings(limit = 20) {
  return getBirdeyeData(
    `/v2/tokens/new_listing?limit=${limit}&meme_platform_enabled=true`,
    (payload) => payload?.data?.items,
    []
  );
}

// GET token security info
export async function getTokenSecurity(address) {
  return getBirdeyeData(
    `/defi/token_security?address=${address}`,
    (payload) => payload?.data,
    null
  );
}

// GET token overview (price, volume, etc)
export async function getTokenOverview(address) {
  return getBirdeyeData(
    `/defi/token_overview?address=${address}`,
    (payload) => payload?.data,
    null
  );
}

// GET multiple token prices
export async function getMultiPrice(addresses) {
  const list = addresses.join(',');
  return getBirdeyeData(
    `/defi/multi_price?list_address=${list}`,
    (payload) => payload?.data,
    {}
  );
}

export function isBirdeyeApiError(error) {
  return error instanceof BirdeyeApiError;
}

// AI-style risk scoring based on security data
export function calculateRiskScore(security) {
  if (!security) return { score: null, label: 'N/A', color: 'gray', flags: [] };

  let score = 100;
  const flags = [];

  if (security.freezeAuthority) { score -= 20; flags.push('Freeze Authority'); }
  if (security.mintAuthority) { score -= 20; flags.push('Mint Authority'); }
  if (security.top10HolderPercent > 80) { score -= 20; flags.push('Whale Concentration'); }
  if (security.top10HolderPercent > 60) { score -= 10; flags.push('High Holder Concentration'); }
  if (!security.isToken2022) { score += 5; }

  let label;
  let color;
  if (score >= 80) { label = 'SAFE'; color = 'green'; }
  else if (score >= 60) { label = 'CAUTION'; color = 'yellow'; }
  else if (score >= 40) { label = 'RISKY'; color = 'orange'; }
  else { label = 'DANGER'; color = 'red'; }

  return { score: Math.max(0, score), label, color, flags };
}
