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
  const [warning, setWarning] = useState('');
  const [stale, setStale] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    setStale(false);

    try {
      const endpoint = tab === 'trending' ? '/api/trending' : '/api/new-listings';
      const res = await fetch(endpoint);
      const json = await res.json();

      if (json.success) {
        setTokens(Array.isArray(json.data) ? json.data : []);
        setLastUpdated(new Date());
        setWarning(json.warning || '');
        setStale(Boolean(json.stale));
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
          content="Solana token surveillance dashboard powered by Birdeye API"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>S</text></svg>"
        />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #07111d 0%, #0b1726 100%)',
          color: '#e5eef8',
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            borderBottom: '1px solid rgba(148,163,184,0.12)',
            background: 'rgba(6,12,21,0.88)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '18px 20px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid rgba(125,211,252,0.18)',
                  background: 'linear-gradient(180deg, rgba(18,34,52,0.95) 0%, rgba(10,18,30,0.95) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dbeafe',
                  fontWeight: 700,
                  fontSize: 20,
                }}
              >
                S
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1, color: '#dbeafe', fontWeight: 700 }}>
                  SolRadar
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7c8ca0', letterSpacing: '0.03em' }}>
                  Solana token surveillance powered by Birdeye
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {lastUpdated && (
                <span style={{ fontSize: 12, color: '#7c8ca0' }}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(110,231,183,0.2)',
                  color: '#6ee7b7',
                  background: 'rgba(16,185,129,0.08)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Auto refresh 30s
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 40px' }}>
          <StatsBar total={tokens.length} safe={safeCount} danger={dangerCount} />

          <div
            style={{
              display: 'inline-flex',
              padding: 4,
              borderRadius: 8,
              background: 'rgba(15,23,36,0.9)',
              border: '1px solid rgba(148,163,184,0.12)',
              marginBottom: 18,
            }}
          >
            {['trending', 'new'].map((value) => {
              const active = tab === value;

              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    background: active ? '#dbeafe' : 'transparent',
                    color: active ? '#0f172a' : '#7c8ca0',
                  }}
                >
                  {value === 'trending' ? 'Trending' : 'New Listings'}
                </button>
              );
            })}
          </div>

          {warning && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 8,
                border: '1px solid rgba(245,158,11,0.22)',
                background: 'rgba(245,158,11,0.08)',
                color: '#fcd34d',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {stale ? 'Showing cached data' : 'Notice'}
              </div>
              <div style={{ fontSize: 12 }}>{warning}</div>
            </div>
          )}

          {error ? (
            <div
              style={{
                borderRadius: 8,
                border: '1px solid rgba(251,113,133,0.22)',
                background: 'rgba(127,29,29,0.18)',
                color: '#fecdd3',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                Unable to load {tab === 'trending' ? 'trending' : 'new listing'} data
              </div>
              <div style={{ fontSize: 12, color: '#fda4af', marginBottom: 12 }}>{error}</div>
              <button
                onClick={fetchTokens}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(251,113,133,0.24)',
                  background: 'rgba(127,29,29,0.24)',
                  color: '#fecdd3',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
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
                gap: 14,
              }}
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 164,
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.08)',
                    background: 'rgba(15,23,36,0.88)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div
              style={{
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.12)',
                background: 'rgba(15,23,36,0.88)',
                color: '#94a3b8',
                padding: 18,
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
                gap: 14,
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
          @keyframes pulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.72; } }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
        `}</style>
      </div>
    </>
  );
}
