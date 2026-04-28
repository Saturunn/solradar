import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import TokenCard from '../components/TokenCard';
import TokenModal from '../components/TokenModal';
import StatsBar from '../components/StatsBar';

const REFRESH_INTERVAL_MS = 30000;

export default function Home() {
  const [tab, setTab] = useState('trending');
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = tab === 'trending' ? '/api/trending' : '/api/new-listings';
      const res = await fetch(endpoint);
      const json = await res.json();

      if (json.success) {
        setTokens(Array.isArray(json.data) ? json.data : []);
        setLastUpdated(new Date());
      } else {
        setTokens([]);
        setError(json.error || 'Unable to load token data right now.');
      }
    } catch (err) {
      console.error(err);
      setTokens([]);
      setError('Unable to load token data right now.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    let intervalId = null;

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPolling = () => {
      if (intervalId || document.visibilityState !== 'visible') {
        return;
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchTokens();
        }
      }, REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTokens();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTokens]);

  const safeCount = tokens.filter((t) => t.riskScore?.label === 'SAFE').length;
  const dangerCount = tokens.filter(
    (t) => t.riskScore?.label === 'DANGER' || t.riskScore?.label === 'RISKY'
  ).length;

  return (
    <>
      <Head>
        <title>SolRadar - Solana Token Intelligence</title>
        <meta
          name="description"
          content="Real-time Solana token scanner powered by Birdeye API"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>S</text></svg>"
        />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)',
          color: '#e2e8f0',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            borderBottom: '1px solid rgba(139,92,246,0.2)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(10px)',
            background: 'rgba(10,10,26,0.8)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>S</span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SolRadar
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                Solana Token Intelligence | Powered by Birdeye
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#475569' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(16,185,129,0.35)',
                background: 'rgba(16,185,129,0.08)',
                color: '#10b981',
                fontSize: 11,
              }}
            >
              Auto Refresh
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
          <StatsBar total={tokens.length} safe={safeCount} danger={dangerCount} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['trending', 'new'].map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  background:
                    tab === value
                      ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                      : 'rgba(255,255,255,0.05)',
                  color: tab === value ? '#fff' : '#64748b',
                }}
              >
                {value === 'trending' ? 'Trending' : 'New Listings'}
              </button>
            ))}
          </div>

          {error ? (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.08)',
                color: '#fecaca',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                Unable to load {tab === 'trending' ? 'trending' : 'new listing'} data
              </div>
              <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>
                {error}
              </div>
              <button
                onClick={fetchTokens}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(248,113,113,0.35)',
                  background: 'rgba(248,113,113,0.12)',
                  color: '#fecaca',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 160,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: '#94a3b8',
                padding: 20,
                fontSize: 13,
              }}
            >
              No tokens available right now for {tab === 'trending' ? 'Trending' : 'New Listings'}.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {tokens.map((token, i) => (
                <TokenCard
                  key={token.address || i}
                  token={token}
                  rank={i + 1}
                  onClick={() => setSelected(token)}
                />
              ))}
            </div>
          )}
        </div>

        {selected && <TokenModal token={selected} onClose={() => setSelected(null)} />}

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        `}</style>
      </div>
    </>
  );
}
