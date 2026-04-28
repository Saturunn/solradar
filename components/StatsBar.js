export default function StatsBar({ total, safe, danger }) {
  const items = [
    { label: 'Scanned', value: total, tone: '#7dd3fc' },
    { label: 'Safer', value: safe, tone: '#6ee7b7' },
    { label: 'Risky', value: danger, tone: '#fb7185' },
    { label: 'Refresh', value: '30s', tone: '#f59e0b' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {items.map(({ label, value, tone }) => (
        <div
          key={label}
          style={{
            background: 'linear-gradient(180deg, rgba(18,27,43,0.96) 0%, rgba(11,18,30,0.96) 100%)',
            border: '1px solid rgba(148,163,184,0.14)',
            borderRadius: 8,
            padding: '14px 16px',
            minHeight: 84,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: tone }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
