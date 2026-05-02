import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import TokenCard from '../components/TokenCard';
import TokenModal from '../components/TokenModal';

const REFRESH_MS = 30000;

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
      const res = await fetch(endpoint);
      const json = await res.json();

      if (json.success) {
        setTokens(Array.isArray(json.data) ? json.data : []);
        setLastUpdated(new Date());
        setWarning(json.warning || '');
        setStale(Boolean(json.stale));
        setFallbackSource(json.fallbackSource || '');
      } else {
        setTokens([]);
        setError(json.error || 'Unable to load data.');
      }
    } catch (_) {
      setTokens([]);
      setError('Unable to load data.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  useEffect(() => {
    let id = null;
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    const start = () => {
      if (id || document.visibilityState !== 'visible') return;
      id = setInterval(() => { if (document.visibilityState === 'visible') fetchTokens(); }, REFRESH_MS);
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') { fetchTokens(); start(); }
      else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchTokens]);

  const safeCount = tokens.filter(t => t.riskScore?.label === 'SAFE').length;
  const riskyCount = tokens.filter(t => t.riskScore?.label === 'DANGER' || t.riskScore?.label === 'RISKY').length;
  const ts = lastUpdated ? lastUpdated.toLocaleTimeString() : '--';

  return (
    <>
      <Head>
        <title>SolRadar — Solana Token Intelligence</title>
        <meta name="description" content="Real-time Solana token tracking with risk analysis powered by Birdeye." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>S</text></svg>" />
      </Head>

      <div className="app-wrapper">
        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-inner">
            <div className="brand">
              <span className="brand-name">SolRadar<span className="brand-dot" /></span>
            </div>
            <div className="nav-meta">
              <span className="meta-chip"><span className="dot" />Live</span>
              <span className="meta-chip">{ts}</span>
            </div>
          </div>
        </nav>

        <main className="main-content">
          {/* Tab Switcher */}
          <div className="tab-group">
            {['trending', 'new'].map(v => (
              <button
                key={v}
                type="button"
                className={`tab-btn${tab === v ? ' active' : ''}`}
                onClick={() => setTab(v)}
              >
                {v === 'trending' ? '🔥 Trending' : '🆕 New Listings'}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Tokens</div>
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{tokens.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Safer</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{safeCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Risky</div>
              <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{riskyCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Source</div>
              <div className="stat-value" style={{ fontSize: 16, color: stale ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
                {fallbackSource === 'trending' ? 'Fallback' : tab === 'trending' ? 'Birdeye' : 'New List'}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="disclaimer">
            <span>⚠️</span>
            <span>
              Risk labels (<strong>SAFE</strong>, <strong>RISKY</strong>, etc.) are simple on-chain heuristics — not financial advice. Always DYOR.
            </span>
          </div>

          {/* Warning banner */}
          {warning ? <div className="banner-warn">{warning}</div> : null}

          {/* Error state */}
          {error ? (
            <div className="banner-error">
              <h3>Unable to load {tab === 'trending' ? 'trending' : 'new listing'} data</h3>
              <p>{error}</p>
              <button type="button" className="btn-retry" onClick={fetchTokens}>
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="token-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" />)}
            </div>
          ) : tokens.length === 0 ? (
            <div className="empty-state">
              <h3>No tokens found</h3>
              <p>The {tab === 'trending' ? 'trending' : 'new listing'} feed returned no data right now.</p>
            </div>
          ) : (
            <div className="token-grid">
              {tokens.map((token, i) => (
                <TokenCard key={token.address || i} token={token} rank={i + 1} onClick={() => setSelected(token)} />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          SolRadar · Data from <a href="https://birdeye.so" target="_blank" rel="noopener noreferrer">Birdeye</a> · Auto-refresh every 30s
        </footer>

        {selected ? <TokenModal token={selected} onClose={() => setSelected(null)} /> : null}
      </div>
    </>
  );
}
