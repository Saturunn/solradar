export default function StatsBar({ total, safe, danger }) {
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
