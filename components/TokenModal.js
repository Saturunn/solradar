function formatPrice(value) {
  const price = Number(value || 0);

  if (price === 0) return '$0.00';
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(2)}`;
}

function formatPercent(value) {
  const amount = Number(value || 0);
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${Math.abs(amount).toFixed(2)}%`;
}

function formatCompactUsd(value) {
  const amount = Number(value || 0);

  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

const RISK_COLORS = {
  green: '#77f2bc',
  yellow: '#ffd166',
  orange: '#ff9f5a',
  red: '#ff6b7a',
  gray: '#95a6bb',
};

function MetricRow({ label, value, tone = '#dce7f5' }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(106,126,148,0.14)',
      }}
    >
      <span style={{ color: '#7d90a8', fontSize: 12 }}>{label}</span>
      <span style={{ color: tone, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function TokenModal({ token, onClose }) {
  const risk = token.riskScore || { label: 'N/A', color: 'gray', flags: [] };
  const security = token.security || {};
  const riskColor = RISK_COLORS[risk.color] || RISK_COLORS.gray;
  const topHolders = security.top10HolderPercent ? `${Number(security.top10HolderPercent).toFixed(1)}%` : 'N/A';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(2, 6, 12, 0.76)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 18,
          border: '1px solid rgba(112,132,155,0.22)',
          background: 'linear-gradient(180deg, rgba(11,18,29,0.99) 0%, rgba(7,13,22,0.99) 100%)',
          boxShadow: '0 36px 80px rgba(0,0,0,0.34)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f839a', marginBottom: 10 }}>
              Token snapshot
            </div>
            <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1, color: '#eff5fb' }}>
              {token.symbol || 'Unknown'}
            </h2>
            <div style={{ marginTop: 8, color: '#89a0b9', fontSize: 13 }}>
              {token.name || 'Unknown token'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid rgba(112,132,155,0.22)',
              background: 'rgba(16,24,37,0.9)',
              color: '#aebed0',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            x
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(112,132,155,0.16)',
              background: 'rgba(13,20,32,0.9)',
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f839a', marginBottom: 12 }}>
              Market
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6f839a', marginBottom: 6 }}>Price</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#eff5fb' }}>{formatPrice(token.price)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6f839a', marginBottom: 6 }}>24h Move</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: Number(token.priceChange24hPercent || 0) >= 0 ? '#77f2bc' : '#ff6b7a' }}>
                  {formatPercent(token.priceChange24hPercent)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6f839a', marginBottom: 6 }}>24h Volume</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#dce7f5' }}>
                  {formatCompactUsd(token.volume24hUSD || token.volumeUSD)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6f839a', marginBottom: 6 }}>Market Cap</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#dce7f5' }}>
                  {token.marketCap ? formatCompactUsd(token.marketCap) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(112,132,155,0.16)',
              background: 'rgba(13,20,32,0.9)',
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f839a', marginBottom: 12 }}>
              Risk
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 38, lineHeight: 1, fontWeight: 700, color: riskColor }}>
                {risk.score ?? 'N/A'}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: riskColor }}>{risk.label || 'N/A'}</div>
                <div style={{ fontSize: 11, color: '#7d90a8' }}>out of 100</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(risk.flags?.length ? risk.flags : ['No critical flags']).map((flag) => (
                <span
                  key={flag}
                  style={{
                    fontSize: 10,
                    color: risk.flags?.length ? '#ffb7bf' : '#95a6bb',
                    border: `1px solid ${risk.flags?.length ? 'rgba(255,107,122,0.18)' : 'rgba(149,166,187,0.18)'}`,
                    background: risk.flags?.length ? 'rgba(255,107,122,0.08)' : 'rgba(149,166,187,0.08)',
                    borderRadius: 999,
                    padding: '6px 8px',
                  }}
                >
                  {flag}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.12)' }}>
              <div style={{ fontSize: 10, color: '#c4a44e', lineHeight: 1.6 }}>
                ⚠️ Risk scores are based on simple on-chain checks (freeze/mint authority, holder concentration). Not financial advice — always DYOR.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(112,132,155,0.16)',
              background: 'rgba(13,20,32,0.9)',
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f839a', marginBottom: 6 }}>
              Security
            </div>
            <MetricRow
              label="Freeze Authority"
              value={security.freezeAuthority ? 'Present' : 'None'}
              tone={security.freezeAuthority ? '#ff6b7a' : '#77f2bc'}
            />
            <MetricRow
              label="Mint Authority"
              value={security.mintAuthority ? 'Present' : 'None'}
              tone={security.mintAuthority ? '#ff6b7a' : '#77f2bc'}
            />
            <MetricRow
              label="Top 10 Holders"
              value={topHolders}
              tone={Number(security.top10HolderPercent || 0) > 60 ? '#ff9f5a' : '#dce7f5'}
            />
            <MetricRow
              label="Token Standard"
              value={security.isToken2022 ? 'Token 2022' : 'SPL Token'}
            />
          </div>

          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(112,132,155,0.16)',
              background: 'rgba(13,20,32,0.9)',
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f839a', marginBottom: 6 }}>
              Reference
            </div>
            <MetricRow label="Address" value={token.address || 'N/A'} />
            <MetricRow label="Symbol" value={token.symbol || 'N/A'} />
            <MetricRow label="Name" value={token.name || 'N/A'} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <a
            href={`https://birdeye.so/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textDecoration: 'none',
              minHeight: 46,
              borderRadius: 12,
              border: '1px solid rgba(112,132,155,0.22)',
              background: 'linear-gradient(180deg, rgba(21,31,46,0.98) 0%, rgba(12,20,31,0.98) 100%)',
              color: '#ebf3fb',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Open in Birdeye
          </a>
          <a
            href={`https://solscan.io/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textDecoration: 'none',
              minHeight: 46,
              borderRadius: 12,
              border: '1px solid rgba(112,132,155,0.22)',
              background: 'rgba(13,20,32,0.9)',
              color: '#b6c7db',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Open in Solscan
          </a>
        </div>
      </div>
    </div>
  );
}
