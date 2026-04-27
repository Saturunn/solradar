export default function TokenCard({ token, rank, onClick }) {
  const risk = token.riskScore || {};
  const change = Number(token.priceChange24hPercent || 0);
  const price = Number(token.price || 0);
  const volume = Number(token.volume24hUSD || token.volumeUSD || 0);

  const riskColors = {
    SAFE: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
    CAUTION: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    RISKY: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', text: '#f97316' },
    DANGER: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
    'N/A': { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#64748b' },
    Unknown: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#64748b' },
  };

  const rc = riskColors[risk.label] || riskColors['N/A'];

  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
      position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Rank badge */}
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, color: '#475569', fontWeight: 600 }}>#{rank}</div>

      {/* Token info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {token.logoURI ? (
          <img src={token.logoURI} alt="" width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
            {(token.symbol || '?')[0]}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{token.symbol || 'Unknown'}</div>
          <div style={{ fontSize: 11, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name || ''}</div>
        </div>
      </div>

      {/* Price & Change */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
          ${price < 0.0001 ? price.toExponential(2) : price < 1 ? price.toFixed(6) : price.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: change >= 0 ? '#10b981' : '#ef4444' }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      </div>

      {/* Volume */}
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        Vol 24h: <span style={{ color: '#94a3b8' }}>${volume > 1e6 ? (volume / 1e6).toFixed(1) + 'M' : volume > 1e3 ? (volume / 1e3).toFixed(1) + 'K' : volume.toFixed(0)}</span>
      </div>

      {/* Risk Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: rc.bg, border: `1px solid ${rc.border}` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: rc.text }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: rc.text }}>
          {risk.label || 'N/A'}{risk.score != null ? ` · ${risk.score}/100` : ''}
        </span>
      </div>

      {/* Flags */}
      {risk.flags && risk.flags.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {risk.flags.map(f => (
            <span key={f} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}
