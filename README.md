# SolRadar - Solana Token Intelligence

Real-time Solana token scanner with risk scoring, powered by the Birdeye Data API.

Built for the Birdeye BIP Competition Sprint 2.

## Features

- **Trending Tokens** - Live feed of top trending Solana tokens
- **New Listings** - Fresh token listings with safety pre-screening
- **Risk Scoring** - Automated score from 0-100 based on security analysis
- **Security Flags** - Freeze authority, mint authority, and holder concentration checks
- **Telegram Alerts** - Alerts when safer trending tokens break out by more than 20% in 24h
- **Telegram Commands** - `/start`, `/help`, `/status`, and `/chatid` via webhook
- **Smart Auto Refresh** - Refreshes every 30 seconds only while the browser tab is active
- **Rate Limiting** - Max 1 request per 10 seconds per IP on data endpoints
- **API Cache** - Successful API responses are cached for 30 seconds

## Birdeye Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /defi/token_trending` | Fetch trending tokens |
| `GET /v2/tokens/new_listing` | Fetch new token listings |
| `GET /defi/token_security` | Token security analysis |
| `GET /defi/token_overview` | Token price and volume data |
| `GET /defi/multi_price` | Multi-token price fetch |

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure env

Create `.env.local` and add:

```bash
BIRDEYE_API_KEY=your_birdeye_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Required only if you want Telegram commands/webhook responses.
PUBLIC_APP_URL=https://your-deployed-app.vercel.app
TELEGRAM_WEBHOOK_SECRET=any_random_secret

# Optional, protects the webhook setup endpoint.
TELEGRAM_SETUP_SECRET=any_random_setup_secret
```

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Test Telegram alerts

After the app is running, call:

```bash
curl http://localhost:3000/api/test-telegram
```

This sends a test message to `TELEGRAM_CHAT_ID`.

### 5. Enable Telegram `/start` responses

Telegram commands require a public HTTPS webhook URL, so local `localhost` will not receive `/start`.

After deploying, set `PUBLIC_APP_URL` to your deployed app URL, then register the webhook:

```bash
curl -X POST "https://your-deployed-app.vercel.app/api/telegram-setup?secret=your_setup_secret"
```

Then `/start`, `/help`, `/status`, and `/chatid` will be handled by:

```text
/api/telegram-webhook
```

## How Alerts Work

The web page calls `/api/trending` when the Trending tab loads and every 30 seconds while the tab is active. That API fetches Birdeye trending tokens, enriches the top tokens with security data, calculates risk, and sends Telegram alerts only when:

- risk score is at least 60,
- 24h price change is greater than 20%,
- the token has not already alerted in the last hour,
- the API response was not served from the 30-second cache.

## Risk Scoring Logic

| Score | Label | Meaning |
|-------|-------|---------|
| 80-100 | SAFE | No major red flags |
| 60-79 | CAUTION | Minor concerns |
| 40-59 | RISKY | Multiple risk factors |
| 0-39 | DANGER | High risk |

Scoring deducts points for:

- Freeze authority present (-20)
- Mint authority present (-20)
- Top 10 holders above 80% (-20)
- Top 10 holders above 60% (-10)

## Tech Stack

- Next.js 14
- Birdeye Data API
- Telegram Bot API
- Vercel
