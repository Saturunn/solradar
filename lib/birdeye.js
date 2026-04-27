const BASE_URL = 'https://public-api.birdeye.so';

const headers = {
  'X-API-KEY': process.env.BIRDEYE_API_KEY,
  'x-chain': 'solana',
};

// GET trending tokens
export async function getTrendingTokens(limit = 20) {
  const res = await fetch(`${BASE_URL}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`, { headers });
  const data = await res.json();
  return data?.data?.tokens || [];
}

// GET new listings
export async function getNewListings(limit = 20) {
  const res = await fetch(`${BASE_URL}/v2/tokens/new_listing?limit=${limit}&meme_platform_enabled=true`, { headers });
  const data = await res.json();
  return data?.data?.items || [];
}

// GET token security info
export async function getTokenSecurity(address) {
  const res = await fetch(`${BASE_URL}/defi/token_security?address=${address}`, { headers });
  const data = await res.json();
  return data?.data || null;
}

// GET token overview (price, volume, etc)
export async function getTokenOverview(address) {
  const res = await fetch(`${BASE_URL}/defi/token_overview?address=${address}`, { headers });
  const data = await res.json();
  return data?.data || null;
}

// GET multiple token prices
export async function getMultiPrice(addresses) {
  const list = addresses.join(',');
  const res = await fetch(`${BASE_URL}/defi/multi_price?list_address=${list}`, { headers });
  const data = await res.json();
  return data?.data || {};
}

// AI-style risk scoring based on security data
export function calculateRiskScore(security) {
  if (!security) return { score: null, label: 'N/A', color: 'gray', flags: [] };

  let score = 100;
  const flags = [];

  if (security.freezeAuthority) { score -= 20; flags.push('Freeze Authority') }
  if (security.mintAuthority)   { score -= 20; flags.push('Mint Authority') }
  if (security.top10HolderPercent > 80) { score -= 20; flags.push('Whale Concentration') }
  if (security.top10HolderPercent > 60) { score -= 10; flags.push('High Holder Concentration') }
  if (!security.isToken2022)    { score += 5 }

  let label, color;
  if (score >= 80)      { label = 'SAFE';    color = 'green' }
  else if (score >= 60) { label = 'CAUTION'; color = 'yellow' }
  else if (score >= 40) { label = 'RISKY';   color = 'orange' }
  else                  { label = 'DANGER';  color = 'red' }

  return { score: Math.max(0, score), label, color, flags };
}