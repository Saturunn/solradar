// TokenModal.js
export function TokenModal({ token, onClose }) {
  const risk = token.riskScore || {};
  const security = token.security || {};

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#f1f5f9' }}>{token.symbol}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{token.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Risk Score */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>AI RISK SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: risk.color === 'green' ? '#10b981' : risk.color === 'yellow' ? '#f59e0b' : risk.color === 'orange' ? '#f97316' : '#ef4444' }}>
              {risk.score ?? 'N/A'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#f1f5f9' }}>{risk.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>out of 100</div>
            </div>
          </div>
          {risk.flags?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>WARNING FLAGS:</div>
              {risk.flags.map(f => <div key={f} style={{ fontSize: 12, color: '#f87171', padding: '3px 0' }}>⚠ {f}</div>)}
            </div>
          )}
        </div>

        {/* Security Details */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>SECURITY DETAILS</div>
          {[
            ['Freeze Authority', security.freezeAuthority ? '⚠ Yes' : '✓ None', !security.freezeAuthority],
            ['Mint Authority', security.mintAuthority ? '⚠ Yes' : '✓ None', !security.mintAuthority],
            ['Top 10 Holders', security.top10HolderPercent ? `${Number(security.top10HolderPercent).toFixed(1)}%` : 'N/A', (security.top10HolderPercent || 0) < 60],
            ['Token Standard', security.isToken2022 ? 'Token 2022' : 'SPL Token', true],
          ].map(([label, value, good]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
              <span style={{ color: '#94a3b8' }}>{label}</span>
              <span style={{ color: good ? '#10b981' : '#f87171', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`https://birdeye.so/token/${token.address}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            View on Birdeye →
          </a>
          <a href={`https://solscan.io/token/${token.address}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            Solscan →
          </a>
        </div>
      </div>
    </div>
  );
}

// StatsBar.js
export function StatsBar({ total, safe, danger }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      {[
        { label: 'Tokens Scanned', value: total, color: '#8b5cf6', icon: '🔍' },
        { label: 'Safe Tokens', value: safe, color: '#10b981', icon: '🟢' },
        { label: 'Risky Tokens', value: danger, color: '#ef4444', icon: '🔴' },
        { label: 'Auto Refresh', value: '30s', color: '#06b6d4', icon: '⟳' },
      ].map(({ label, value, color, icon }) => (
        <div key={label} style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{icon} {label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default TokenModal;
