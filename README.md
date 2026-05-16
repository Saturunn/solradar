# SolRadar — Solana Token Intelligence

> Real-time Solana token surveillance dashboard with automated risk scoring, powered by the [Birdeye Data API](https://birdeye.so).

**Live:** [solradar-plum.vercel.app](https://solradar-plum.vercel.app)

---

## What It Does

SolRadar helps traders and researchers quickly assess new and trending Solana tokens by combining Birdeye market data with on-chain security analysis.

### Dashboard Features
- **Trending & New Listing Feeds** — Real-time token data from Birdeye, auto-refreshing every 30s
- **Token Search** — Paste any Solana token address to instantly inspect price, volume, and risk
- **Risk Scoring Engine** — Automated 0-100 safety score based on multiple on-chain heuristics
- **Sort & Filter** — Sort by volume, price change, or risk score. Toggle to show only safer tokens
- **Token Detail Modal** — Click any token for full market data, security breakdown, and copyable address
- **Graceful Degradation** — Stale-while-revalidate caching ensures data is always shown, even during API outages

### Telegram Bot
- `/trending` — Top trending tokens with 24h stats
- `/new` — Latest new listings (with trending fallback)
- `/safe` — Safer trending candidates filtered by risk score ≥ 60
- `/token <address>` — Deep lookup on any token
- `/compare <addr1> <addr2>` — Side-by-side comparison of two tokens with risk verdict
- **Auto Alerts** — Sends alerts to your chat when a safer trending token breaks out >20% in 24h

---

## Risk Scoring Logic

Tokens start at 100 and points are deducted for red flags:

| Check | Deduction | Why it matters |
|-------|-----------|----------------|
| Freeze Authority present | -20 | Issuer can freeze your tokens |
| Mint Authority present | -20 | Issuer can print unlimited supply |
| Top 10 holders > 80% | -20 | Extreme whale concentration |
| Top 10 holders > 60% | -10 | High concentration risk |
| Creator holds > 50% | -15 | Creator insider risk |
| Creator holds > 20% | -5 | Moderate creator exposure |
| Liquidity/FDV ratio < 2% | -15 | Very thin exit liquidity |
| Liquidity/FDV ratio < 5% | -5 | Below-average liquidity |
| Non-Token2022 standard | +5 | More widely supported |

**Score → Label:**

| Range | Label | Meaning |
|-------|-------|---------|
| 80–100 | SAFE | No major red flags detected |
| 60–79 | CAUTION | Minor concerns worth noting |
| 40–59 | RISKY | Multiple risk factors present |
| 0–39 | DANGER | High risk — proceed with extreme caution |

> ⚠️ Risk scores are simple heuristic checks. They are **not financial advice**. Always DYOR.

---

## Birdeye API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/defi/token_trending` | GET | Fetch top trending Solana tokens by rank |
| `/defi/v2/tokens/new_listing` | GET | Fetch newly listed tokens from DEX liquidity pools |
| `/defi/token_security` | GET | Security analysis (freeze/mint authority, holder concentration) |
| `/defi/token_overview` | GET | Real-time price, volume, market cap for individual tokens |
| `/defi/multi_price` | GET | Batch price lookup for multiple token addresses |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)            │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Trending  │  │    New    │  │   Search   │  │
│  │    Tab     │  │ Listings  │  │    Bar     │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  │
│        │              │              │          │
│  ┌─────┴──────────────┴──────────────┴──────┐   │
│  │         Sort / Filter / Modal            │   │
│  └──────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │ API Routes
          ┌────────┴────────┐
          │  /api/trending  │──── Rate Limit + Cache
          │  /api/new-list  │──── Stale-while-revalidate
          │  /api/token     │──── Per-IP throttle
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │  Birdeye Public │
          │      API        │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │   Risk Engine   │
          │  (score 0-100)  │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │  Telegram Bot   │
          │  (webhook)      │
          │  Alerts + Cmds  │
          └─────────────────┘
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
BIRDEYE_API_KEY=your_birdeye_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
PUBLIC_APP_URL=https://solradar-plum.vercel.app
TELEGRAM_SETUP_SECRET=any_random_secret
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

After deploying, register the Telegram webhook:

```bash
curl -X POST "https://your-app.vercel.app/api/telegram-setup?secret=your_setup_secret"
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (Pages Router) |
| Styling | Vanilla CSS with CSS Variables |
| Data API | Birdeye Public API |
| Bot | Telegram Bot API via node-telegram-bot-api |
| Hosting | Vercel Serverless Functions |
| Caching | In-memory with stale-while-revalidate |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/trending` | GET | Trending tokens + risk enrichment + alert dispatch |
| `/api/new-listings` | GET | New listings with trending fallback |
| `/api/token?address=...` | GET | Single token overview + security + risk |
| `/api/telegram-webhook` | POST | Telegram bot command handler |
| `/api/telegram-setup` | POST | Register webhook + bot commands |

---

## How Alerts Work

1. The dashboard calls `/api/trending` every 30 seconds
2. The API enriches the top 6 tokens with security data from Birdeye
3. For each token, the risk engine calculates a score (0-100)
4. If a token has **risk score ≥ 60** AND **24h change > 20%** AND has **not alerted in the last hour**, a Telegram alert is sent
5. Alert cooldown prevents spam (1 alert per token per hour)

---

Built for the Birdeye BIP Competition Sprint 2.
