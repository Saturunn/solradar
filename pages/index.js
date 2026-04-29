import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import TokenCard from '../components/TokenCard';
import TokenModal from '../components/TokenModal';
import StatsBar from '../components/StatsBar';

const REFRESH_INTERVAL_MS = 30000;

function formatTimestamp(date) {
  if (!date) return '--';
  return date.toLocaleTimeString();
}

export default function Home() {
  const [tab, setTab] = useState('trending');
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [stale, setStale] = useState(false);
  const [fallbackSource, setFallbackSource] = useState('');

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    setStale(false);
    setFallbackSource('');

    try {
      const endpoint = tab === 'trending' ? '/api/trending' : '/api/new-listings';
      const response = await fetch(endpoint);
      const json = await response.json();

      if (json.success) {
        setTokens(Array.isArray(json.data) ? json.data : []);
        setLastUpdated(new Date());
        setWarning(json.warning || '');
        setStale(Boolean(json.stale));
        setFallbackSource(json.fallbackSource || '');
      } else {
        setTokens([]);
        setError(json.error || 'Unable to load token data right now.');
      }
    } catch (fetchError) {
      console.error(fetchError);
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

  const safeCount = tokens.filter((token) => token.riskScore?.label === 'SAFE').length;
  const dangerCount = tokens.filter(
    (token) => token.riskScore?.label === 'DANGER' || token.riskScore?.label === 'RISKY'
  ).length;

  const panelTitle = tab === 'trending' ? 'Trending radar' : 'New listing intake';
  const panelDescription = tab === 'trending'
    ? 'Real-time ranking of active Solana tokens with optional risk enrichment.'
    : 'Early feed for newly surfaced tokens with graceful fallback when upstream listing data fails.';

  return (
    <>
      <Head>
        <title>SolRadar - Solana Token Intelligence</title>
        <meta
          name="description"
          content="Professional Solana token ops dashboard powered by Birdeye market intelligence."
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>S</text></svg>"
        />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top left, rgba(45,67,96,0.18) 0%, rgba(8,14,24,0) 28%), linear-gradient(180deg, #06101b 0%, #09131f 100%)',
          color: '#dce7f5',
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ borderBottom: '1px solid rgba(106,126,148,0.16)', background: 'rgba(5,10,18,0.78)', backdropFilter: 'blur(16px)' }}>
          <div
            style={{
              maxWidth: 1320,
              margin: '0 auto',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid rgba(121,145,172,0.22)',
                  background: 'linear-gradient(180deg, rgba(18,29,43,0.98) 0%, rgba(11,18,28,0.98) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#f0f6fd',
                }}
              >
                S
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 29, lineHeight: 1, color: '#eff5fb' }}>SolRadar</h1>
                <div style={{ marginTop: 5, fontSize: 12, color: '#7f92a8', letterSpacing: '0.03em' }}>
                  Solana market surveillance desk
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  minWidth: 150,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(106,126,148,0.16)',
                  background: 'rgba(10,16,27,0.92)',
                }}
              >
                <div style={{ fontSize: 10, color: '#6f839a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Updated
                </div>
                <div style={{ fontSize: 14, color: '#dbe7f5', fontWeight: 600 }}>
                  {formatTimestamp(lastUpdated)}
                </div>
              </div>

              <div
                style={{
                  minWidth: 150,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(90,170,132,0.16)',
                  background: 'rgba(10,20,18,0.92)',
                }}
              >
                <div style={{ fontSize: 10, color: '#6f9c85', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Refresh
                </div>
                <div style={{ fontSize: 14, color: '#77f2bc', fontWeight: 700 }}>
                  Active tab / 30s
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '26px 20px 44px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <section
              style={{
                borderRadius: 18,
                border: '1px solid rgba(106,126,148,0.18)',
                background: 'linear-gradient(180deg, rgba(11,18,29,0.98) 0%, rgba(8,14,23,0.98) 100%)',
                padding: 22,
                boxShadow: '0 28px 56px rgba(2, 8, 16, 0.22)',
              }}
            >
              <div style={{ fontSize: 11, color: '#6f839a', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>
                Active board
              </div>
              <div style={{ fontSize: 38, lineHeight: 1.02, fontWeight: 700, color: '#f0f6fd', maxWidth: 760 }}>
                {tab === 'trending' ? 'Track high-momentum Solana tokens with risk context.' : 'Monitor new token flow without losing the desk when upstream feed fails.'}
              </div>
              <div style={{ marginTop: 14, maxWidth: 720, color: '#8ea2b8', fontSize: 14, lineHeight: 1.7 }}>
                {panelDescription}
              </div>
            </section>

            <section
              style={{
                borderRadius: 18,
                border: '1px solid rgba(106,126,148,0.18)',
                background: 'linear-gradient(180deg, rgba(12,20,32,0.98) 0%, rgba(8,13,22,0.98) 100%)',
                padding: 22,
              }}
            >
              <div style={{ fontSize: 11, color: '#6f839a', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>
                Feed status
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#edf4fb', marginBottom: 12 }}>
                {panelTitle}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(106,126,148,0.12)' }}>
                  <span style={{ fontSize: 12, color: '#7f92a8' }}>State</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: error ? '#ff6b7a' : stale ? '#ffd166' : '#77f2bc' }}>
                    {error ? 'Degraded' : stale ? 'Cached / fallback' : 'Healthy'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(106,126,148,0.12)' }}>
                  <span style={{ fontSize: 12, color: '#7f92a8' }}>Source</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dce7f5' }}>
                    {fallbackSource === 'trending'
                      ? 'Trending fallback'
                      : tab === 'trending'
                        ? 'Birdeye trending'
                        : 'Birdeye new listing'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#7f92a8' }}>Rows</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dce7f5' }}>{tokens.length}</span>
                </div>
              </div>
            </section>
          </div>

          <StatsBar
            total={tokens.length}
            safe={safeCount}
            danger={dangerCount}
            activeTab={tab}
            fallbackSource={fallbackSource}
          />

          <div
            style={{
              display: 'inline-flex',
              padding: 5,
              borderRadius: 14,
              background: 'rgba(10,16,27,0.96)',
              border: '1px solid rgba(106,126,148,0.16)',
              marginBottom: 18,
            }}
          >
            {['trending', 'new'].map((value) => {
              const active = tab === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  style={{
                    minWidth: 132,
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: active
                      ? 'linear-gradient(180deg, rgba(228,237,248,0.98) 0%, rgba(206,220,236,0.98) 100%)'
                      : 'transparent',
                    color: active ? '#09131d' : '#8ea2b8',
                    fontSize: 13,
                    fontWeight: 700,
                    transition: 'background 180ms ease, color 180ms ease, transform 180ms ease',
                  }}
                >
                  {value === 'trending' ? 'Trending' : 'New Listings'}
                </button>
              );
            })}
          </div>

          {warning ? (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 14,
                border: '1px solid rgba(255,209,102,0.16)',
                background: 'linear-gradient(180deg, rgba(43,32,12,0.34) 0%, rgba(27,22,12,0.34) 100%)',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 11, color: '#cba75d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {fallbackSource === 'trending'
                  ? 'Fallback dataset'
                  : stale
                    ? 'Cached feed'
                    : 'Feed notice'}
              </div>
              <div style={{ fontSize: 13, color: '#f0d99d', lineHeight: 1.6 }}>{warning}</div>
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,107,122,0.18)',
                background: 'linear-gradient(180deg, rgba(42,16,22,0.46) 0%, rgba(29,13,18,0.46) 100%)',
                padding: 18,
              }}
            >
              <div style={{ fontSize: 11, color: '#d69aa2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Hard failure
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f9d5dc', marginBottom: 8 }}>
                Unable to load {tab === 'trending' ? 'trending' : 'new listing'} data
              </div>
              <div style={{ fontSize: 13, color: '#f0a9b4', lineHeight: 1.6, marginBottom: 14 }}>
                {error}
              </div>
              <button
                type="button"
                onClick={fetchTokens}
                style={{
                  minHeight: 42,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,107,122,0.18)',
                  background: 'rgba(255,107,122,0.08)',
                  color: '#ffd4db',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Retry request
              </button>
            </div>
          ) : loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: 14,
              }}
            >
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  style={{
                    height: 210,
                    borderRadius: 14,
                    border: '1px solid rgba(106,126,148,0.16)',
                    background: 'linear-gradient(180deg, rgba(11,18,29,0.98) 0%, rgba(8,13,22,0.98) 100%)',
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(106,126,148,0.16)',
                background: 'linear-gradient(180deg, rgba(12,19,31,0.98) 0%, rgba(8,13,22,0.98) 100%)',
                padding: 18,
              }}
            >
              <div style={{ fontSize: 11, color: '#6f839a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Empty feed
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#edf4fb', marginBottom: 8 }}>
                No tokens available right now
              </div>
              <div style={{ fontSize: 13, color: '#8ea2b8', lineHeight: 1.6 }}>
                {tab === 'trending'
                  ? 'The trending feed returned no rows at the moment.'
                  : 'The new listing feed returned no rows at the moment.'}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: 14,
              }}
            >
              {tokens.map((token, index) => (
                <TokenCard
                  key={token.address || index}
                  token={token}
                  rank={index + 1}
                  onClick={() => setSelected(token)}
                />
              ))}
            </div>
          )}
        </div>

        {selected ? <TokenModal token={selected} onClose={() => setSelected(null)} /> : null}

        <style>{`
          * { box-sizing: border-box; }
          @keyframes pulse {
            0%, 100% { opacity: 0.42; }
            50% { opacity: 0.74; }
          }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(106,126,148,0.42); border-radius: 999px; }
        `}</style>
      </div>
    </>
  );
}
