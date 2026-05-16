import { useState, useEffect } from 'react';

function fmtPrice(v) {
  const p = Number(v || 0);
  if (p === 0) return '$0.00';
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  return `$${p.toFixed(2)}`;
}

function fmtPct(v) {
  const n = Number(v || 0);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function compact(v) {
  const n = Number(v || 0);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const RISK_COLOR = {
  green: 'var(--accent-green)',
  yellow: 'var(--accent-yellow)',
  orange: 'var(--accent-orange)',
  red: 'var(--accent-red)',
  gray: 'var(--text-muted)',
};

function Row({ label, value, color }) {
  return (
    <div className="modal-metric-row">
      <span className="modal-metric-label">{label}</span>
      <span className="modal-metric-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// SVG Sparkline component — renders 24h price trend
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const padY = 4;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = padY + ((max - p) / range) * (h - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#34d399' : '#f87171';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 60, display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points.join(' ')} ${w},${h}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TokenModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const [priceHistory, setPriceHistory] = useState(null);
  const risk = token.riskScore || { label: 'N/A', color: 'gray', flags: [] };
  const sec = token.security || {};
  const rc = RISK_COLOR[risk.color] || RISK_COLOR.gray;
  const top10 = sec.top10HolderPercent ? `${Number(sec.top10HolderPercent).toFixed(1)}%` : 'N/A';
  const change = Number(token.price24hChangePercent || token.priceChange24hPercent || 0);

  // Fetch 24h price history for sparkline
  useEffect(() => {
    if (!token.address) return;
    let cancelled = false;
    fetch(`/api/price-history?address=${token.address}`)
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setPriceHistory(json.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token.address]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="modal-title">{token.symbol || 'Unknown'}</div>
            <div className="modal-sub">{token.name || 'Unknown token'}</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Sparkline */}
        {priceHistory && priceHistory.length > 1 && (
          <div className="modal-section" style={{ marginBottom: 12 }}>
            <div className="modal-section-title">24h Price Trend</div>
            <Sparkline data={priceHistory} />
          </div>
        )}

        {/* Market + Risk */}
        <div className="modal-grid">
          <div className="modal-section">
            <div className="modal-section-title">Market</div>
            <Row label="Price" value={fmtPrice(token.price)} />
            <Row label="24h Change" value={fmtPct(token.price24hChangePercent || token.priceChange24hPercent)} color={change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
            <Row label="24h Volume" value={compact(token.volume24hUSD || token.volumeUSD)} />
            <Row label="Market Cap" value={compact(token.marketcap || token.marketCap)} />
            <Row label="Liquidity" value={compact(token.liquidity)} />
          </div>

          <div className="modal-section">
            <div className="modal-section-title">Risk Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: rc }}>
                {risk.score ?? '—'}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: rc }}>{risk.label || 'N/A'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>out of 100</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(risk.flags?.length ? risk.flags : ['No flags']).map(f => (
                <span key={f} className="flag-tag" style={!risk.flags?.length ? { color: 'var(--text-muted)', background: 'rgba(100,116,139,0.08)', borderColor: 'rgba(100,116,139,0.1)' } : undefined}>
                  {f}
                </span>
              ))}
            </div>

            <div className="modal-disclaimer">
              ⚠️ Risk scores use simple on-chain heuristics. Not financial advice — always DYOR.
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="modal-grid">
          <div className="modal-section">
            <div className="modal-section-title">Security</div>
            <Row label="Freeze Authority" value={sec.freezeAuthority ? 'Present' : 'None'} color={sec.freezeAuthority ? 'var(--accent-red)' : 'var(--accent-green)'} />
            <Row label="Mint Authority" value={sec.mintAuthority ? 'Present' : 'None'} color={sec.mintAuthority ? 'var(--accent-red)' : 'var(--accent-green)'} />
            <Row label="Top 10 Holders" value={top10} color={Number(sec.top10HolderPercent || 0) > 60 ? 'var(--accent-orange)' : undefined} />
            <Row label="Standard" value={sec.isToken2022 ? 'Token 2022' : 'SPL Token'} />
          </div>

          <div className="modal-section">
            <div className="modal-section-title">Info</div>
            <div className="modal-metric-row">
              <span className="modal-metric-label">Address</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="modal-metric-value" style={{ fontSize: 11 }}>
                  {token.address ? `${token.address.slice(0, 8)}...${token.address.slice(-6)}` : 'N/A'}
                </span>
                {token.address && (
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(token.address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </span>
            </div>
            <Row label="Symbol" value={token.symbol || 'N/A'} />
            <Row label="Name" value={token.name || 'N/A'} />
          </div>
        </div>

        {/* Links */}
        <div className="modal-links">
          <a className="modal-link" href={`https://birdeye.so/token/${token.address}?chain=solana`} target="_blank" rel="noopener noreferrer">
            Birdeye ↗
          </a>
          <a className="modal-link" href={`https://solscan.io/token/${token.address}`} target="_blank" rel="noopener noreferrer">
            Solscan ↗
          </a>
        </div>
      </div>
    </div>
  );
}
