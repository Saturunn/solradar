export default function StatsBar({ total, safe, danger, activeTab, fallbackSource }) {
  const items = [
    { label: 'Scanned', value: total, accent: '#7cc8ff' },
    { label: 'Safer', value: safe, accent: '#77f2bc' },
    { label: 'Risky', value: danger, accent: '#ff6b7a' },
    {
      label: 'Feed',
      value: fallbackSource === 'trending'
        ? 'Fallback'
        : activeTab === 'trending'
          ? 'Trending'
          : 'New',
      accent: fallbackSource === 'trending' ? '#ffd166' : '#d8e3f0',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 12,
        marginBottom: 22,
      }}
    >
      {items.map(({ label, value, accent }) => (
        <div
          key={label}
          style={{
            minHeight: 98,
            borderRadius: 14,
            border: '1px solid rgba(106,126,148,0.18)',
            background: 'linear-gradient(180deg, rgba(13,20,32,0.98) 0%, rgba(9,15,25,0.98) 100%)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 11, color: '#6f839a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </div>
          <div style={{ fontSize: typeof value === 'number' ? 32 : 20, lineHeight: 1, fontWeight: 700, color: accent }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
