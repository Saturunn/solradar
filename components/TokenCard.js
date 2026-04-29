function formatPrice(value) {
  const price = Number(value || 0);

  if (price === 0) return '$0.00';
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(2)}`;
}

function formatCompactUsd(value) {
  const amount = Number(value || 0);

  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatChange(value) {
  const change = Number(value || 0);
  const sign = change >= 0 ? '+' : '-';
  return `${sign}${Math.abs(change).toFixed(2)}%`;
}

const RISK_STYLES = {
  SAFE: { text: '#77f2bc', border: 'rgba(119,242,188,0.22)', bg: 'rgba(119,242,188,0.08)' },
  CAUTION: { text: '#ffd166', border: 'rgba(255,209,102,0.2)', bg: 'rgba(255,209,102,0.08)' },
  RISKY: { text: '#ff9f5a', border: 'rgba(255,159,90,0.22)', bg: 'rgba(255,159,90,0.08)' },
  DANGER: { text: '#ff6b7a', border: 'rgba(255,107,122,0.22)', bg: 'rgba(255,107,122,0.08)' },
  'N/A': { text: '#95a6bb', border: 'rgba(149,166,187,0.18)', bg: 'rgba(149,166,187,0.08)' },
};

export default function TokenCard({ token, rank, onClick }) {
  const risk = token.riskScore || {};
  const riskStyle = RISK_STYLES[risk.label] || RISK_STYLES['N/A'];
  const change = Number(token.priceChange24hPercent || 0);
  const volume = Number(token.volume24hUSD || token.volumeUSD || 0);
  const marketCap = Number(token.marketCap || token.marketcap || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: '1px solid rgba(106,126,148,0.18)',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(12,20,32,0.98) 0%, rgba(9,15,26,0.98) 100%)',
        padding: 18,
        cursor: 'pointer',
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        boxShadow: '0 18px 42px rgba(3, 8, 18, 0.24)',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-3px)';
        event.currentTarget.style.borderColor = 'rgba(141, 167, 196, 0.32)';
        event.currentTarget.style.boxShadow = '0 26px 54px rgba(3, 8, 18, 0.34)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.borderColor = 'rgba(106,126,148,0.18)';
        event.currentTarget.style.boxShadow = '0 18px 42px rgba(3, 8, 18, 0.24)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          {token.logoURI ? (
            <img
              src={token.logoURI}
              alt=""
              width={42}
              height={42}
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                objectFit: 'cover',
                border: '1px solid rgba(148,163,184,0.18)',
                background: '#0f1723',
              }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                border: '1px solid rgba(114, 138, 164, 0.2)',
                background: 'linear-gradient(180deg, rgba(23,33,47,0.98) 0%, rgba(14,21,32,0.98) 100%)',
                color: '#d8e3f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(token.symbol || '?').slice(0, 1)}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#edf4fb' }}>
                {token.symbol || 'Unknown'}
              </div>
              <div style={{ fontSize: 11, color: '#73869c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Rank #{rank}
              </div>
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#8ea0b4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {token.name || 'Unknown token'}
            </div>
          </div>
        </div>

        <div
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            color: riskStyle.text,
            border: `1px solid ${riskStyle.border}`,
            background: riskStyle.bg,
            whiteSpace: 'nowrap',
          }}
        >
          {risk.label || 'N/A'}
          {risk.score != null ? `${risk.score}/100` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6c8097', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Price
          </div>
          <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 700, color: '#f3f7fc' }}>
            {formatPrice(token.price)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#6c8097', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            24h Move
          </div>
          <div
            style={{
              fontSize: 20,
              lineHeight: 1,
              fontWeight: 700,
              color: change >= 0 ? '#79f2bc' : '#ff6b7a',
            }}
          >
            {formatChange(change)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          paddingTop: 14,
          borderTop: '1px solid rgba(106,126,148,0.16)',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#6c8097', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Volume
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d9e4f2' }}>{formatCompactUsd(volume)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6c8097', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            MCap
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d9e4f2' }}>
            {marketCap > 0 ? formatCompactUsd(marketCap) : 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6c8097', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Flags
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d9e4f2' }}>
            {risk.flags?.length ? risk.flags.length : 0}
          </div>
        </div>
      </div>

      {risk.flags?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {risk.flags.slice(0, 3).map((flag) => (
            <span
              key={flag}
              style={{
                fontSize: 10,
                lineHeight: 1,
                color: '#ffb7bf',
                border: '1px solid rgba(255,107,122,0.16)',
                background: 'rgba(255,107,122,0.08)',
                borderRadius: 999,
                padding: '6px 8px',
              }}
            >
              {flag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
