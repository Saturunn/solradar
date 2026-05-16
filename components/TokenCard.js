import { useState } from 'react';

function formatPrice(v) {
  const p = Number(v || 0);
  if (p === 0) return '$0.00';
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(2)}`;
}

function compact(v) {
  const n = Number(v || 0);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return '—';
}

// Generate consistent color from symbol string
function symbolHue(sym) {
  let hash = 0;
  for (let i = 0; i < (sym || '').length; i++) hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

const RISK_CLASS = {
  SAFE: 'risk-safe',
  CAUTION: 'risk-caution',
  RISKY: 'risk-risky',
  DANGER: 'risk-danger',
  'N/A': 'risk-na',
};

export default function TokenCard({ token, rank, onClick }) {
  const [imgError, setImgError] = useState(false);
  const risk = token.riskScore || {};

  // Birdeye uses price24hChangePercent, but we also handle priceChange24hPercent
  const change = Number(token.price24hChangePercent || token.priceChange24hPercent || 0);
  const vol = Number(token.volume24hUSD || token.volumeUSD || 0);
  const mcap = Number(token.marketcap || token.marketCap || 0);
  const liq = Number(token.liquidity || 0);
  const sign = change >= 0 ? '+' : '';
  const cls = RISK_CLASS[risk.label] || 'risk-na';
  const letter = (token.symbol || '?').charAt(0).toUpperCase();
  const hue = symbolHue(token.symbol);

  return (
    <button type="button" className="token-card" onClick={onClick}>
      <div className="token-header">
        <div className="token-info">
          {token.logoURI && !imgError ? (
            <img
              className="token-icon"
              src={token.logoURI}
              alt=""
              width={36}
              height={36}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="token-icon-fallback"
              style={{ background: `hsl(${hue}, 45%, 22%)`, color: `hsl(${hue}, 60%, 72%)` }}
            >
              {letter}
            </div>
          )}
          <div className="token-name-group">
            <div>
              <span className="token-symbol">{token.symbol || 'Unknown'}</span>
              <span className="token-rank">#{rank}</span>
            </div>
            <div className="token-fullname">{token.name || 'Unknown token'}</div>
          </div>
        </div>

        <span className={`risk-badge ${cls}`}>
          {risk.label || 'N/A'}
          {risk.score != null ? ` ${risk.score}` : ''}
        </span>
      </div>

      <div className="token-price-row">
        <span className="token-price">{formatPrice(token.price)}</span>
        <span className={`token-change ${change >= 0 ? 'change-up' : 'change-down'}`}>
          {sign}{Math.abs(change).toFixed(2)}%
        </span>
      </div>

      <div className="token-metrics">
        <div>
          <div className="metric-label">Volume</div>
          <div className="metric-value">{compact(vol)}</div>
        </div>
        <div>
          <div className="metric-label">MCap</div>
          <div className="metric-value">{compact(mcap)}</div>
        </div>
        <div>
          <div className="metric-label">Liquidity</div>
          <div className="metric-value">{compact(liq)}</div>
        </div>
      </div>

      {risk.flags?.length ? (
        <div className="token-flags">
          {risk.flags.slice(0, 3).map(f => (
            <span key={f} className="flag-tag">{f}</span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
