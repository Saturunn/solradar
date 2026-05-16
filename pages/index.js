import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import TokenCard from '../components/TokenCard';
import TokenModal from '../components/TokenModal';

const REFRESH_MS = 30000;

const SORT_OPTIONS = [
  { value: 'rank', label: 'Rank' },
  { value: 'volume', label: 'Volume ↓' },
  { value: 'change', label: '24h Change ↓' },
  { value: 'risk', label: 'Risk Score ↓' },
];

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

  // Search
  const [searchAddr, setSearchAddr] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Sort & Filter
  const [sortBy, setSortBy] = useState('rank');
  const [safeOnly, setSafeOnly] = useState(false);

  // Easter eggs
  const [easterEgg, setEasterEgg] = useState(null);
  const [logoClicks, setLogoClicks] = useState(0);

  // Konami Code: ↑↑↓↓←→←→BA
  useEffect(() => {
    const KONAMI = [38,38,40,40,37,39,37,39,66,65];
    let pos = 0;
    const onKey = (e) => {
      if (e.keyCode === KONAMI[pos]) {
        pos++;
        if (pos === KONAMI.length) {
          pos = 0;
          setEasterEgg('konami');
          setTimeout(() => setEasterEgg(null), 6000);
        }
      } else {
        pos = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Logo click Easter egg
  useEffect(() => {
    if (logoClicks >= 7) {
      setEasterEgg('wagmi');
      setLogoClicks(0);
      setTimeout(() => setEasterEgg(null), 4000);
    }
  }, [logoClicks]);

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

  // Search handler
  const handleSearch = useCallback(async () => {
    const addr = searchAddr.trim();

    // Easter egg: search bar secrets
    const lower = addr.toLowerCase();
    if (lower === 'wen moon' || lower === 'wen lambo') {
      setEasterEgg('moon');
      setSearchAddr('');
      setTimeout(() => setEasterEgg(null), 5000);
      return;
    }
    if (lower === 'gm') {
      setEasterEgg('gm');
      setSearchAddr('');
      setTimeout(() => setEasterEgg(null), 3000);
      return;
    }
    if (lower === 'ngmi' || lower === 'rekt') {
      setEasterEgg('ngmi');
      setSearchAddr('');
      setTimeout(() => setEasterEgg(null), 4000);
      return;
    }

    if (!addr || addr.length < 32) return;

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/token?address=${addr}`);
      const json = await res.json();
      if (json.success && json.data) {
        const { overview, security, riskScore } = json.data;
        setSelected({
          address: addr,
          symbol: overview?.symbol || 'Unknown',
          name: overview?.name || 'Unknown token',
          price: overview?.price,
          priceChange24hPercent: overview?.priceChange24hPercent,
          volume24hUSD: overview?.v24hUSD || overview?.volume24hUSD,
          marketCap: overview?.mc || overview?.marketCap,
          logoURI: overview?.logoURI,
          security,
          riskScore,
        });
      } else {
        alert('Token not found or unavailable.');
      }
    } catch (_) {
      alert('Failed to fetch token data.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchAddr]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Sorted & filtered tokens
  const displayTokens = useMemo(() => {
    let list = [...tokens];

    if (safeOnly) {
      list = list.filter(t => t.riskScore?.label === 'SAFE' || t.riskScore?.label === 'CAUTION');
    }

    if (sortBy === 'volume') {
      list.sort((a, b) => Number(b.volume24hUSD || b.volumeUSD || 0) - Number(a.volume24hUSD || a.volumeUSD || 0));
    } else if (sortBy === 'change') {
      list.sort((a, b) => Number(b.price24hChangePercent || b.priceChange24hPercent || 0) - Number(a.price24hChangePercent || a.priceChange24hPercent || 0));
    } else if (sortBy === 'risk') {
      list.sort((a, b) => (b.riskScore?.score ?? -1) - (a.riskScore?.score ?? -1));
    }

    return list;
  }, [tokens, sortBy, safeOnly]);

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
            <div className="brand" onClick={() => setLogoClicks(c => c + 1)} style={{ cursor: 'pointer', userSelect: 'none' }}>
              <span className="brand-name">SolRadar<span className="brand-dot" /></span>
            </div>
            <div className="nav-meta">
              <span className="meta-chip"><span className="dot" />Live</span>
              <span className="meta-chip">{ts}</span>
            </div>
          </div>
        </nav>

        <main className="main-content">
          {/* Search Bar */}
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Paste token address to inspect…"
              value={searchAddr}
              onChange={e => setSearchAddr(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              type="button"
              className="search-btn"
              onClick={handleSearch}
              disabled={searchLoading || searchAddr.trim().length < 32}
            >
              {searchLoading ? 'Scanning…' : 'Inspect'}
            </button>
          </div>

          {/* Tab Switcher + Controls Row */}
          <div className="controls-row">
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

            <div className="filter-controls">
              <select
                className="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <button
                type="button"
                className={`filter-btn${safeOnly ? ' active' : ''}`}
                onClick={() => setSafeOnly(prev => !prev)}
              >
                {safeOnly ? '✓ Safer Only' : 'Show All'}
              </button>
            </div>
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
          ) : displayTokens.length === 0 ? (
            <div className="empty-state">
              <h3>{safeOnly ? 'No safer tokens found' : 'No tokens found'}</h3>
              <p>{safeOnly ? 'No tokens with SAFE or CAUTION rating right now.' : `The ${tab} feed returned no data.`}</p>
            </div>
          ) : (
            <div className="token-grid">
              {displayTokens.map((token, i) => (
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

        {/* Easter Eggs */}
        {easterEgg === 'konami' && (
          <div className="easter-egg-overlay" onClick={() => setEasterEgg(null)}>
            <div className="easter-egg-content konami-mode">
              <div className="rocket-rain">
                {[...Array(20)].map((_, i) => (
                  <span key={i} className="flying-rocket" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1.5 + Math.random() * 2}s`,
                    fontSize: `${20 + Math.random() * 30}px`,
                  }}>
                    {['🚀','💎','🌙','⚡','🔥','💰'][i % 6]}
                  </span>
                ))}
              </div>
              <div className="meme-text">
                <div className="meme-big">🚀 PUMP IT 🚀</div>
                <div className="meme-sub">Konami Code Activated!</div>
                <div className="meme-sub">Number go up technology™</div>
              </div>
            </div>
          </div>
        )}

        {easterEgg === 'moon' && (
          <div className="easter-egg-overlay" onClick={() => setEasterEgg(null)}>
            <div className="easter-egg-content moon-mode">
              <div className="meme-text">
                <div style={{ fontSize: 80 }}>🌙</div>
                <div className="meme-big">Soon™</div>
                <div className="meme-sub">Trust the process. WAGMI.</div>
                <div className="meme-sub" style={{ marginTop: 8, opacity: 0.5 }}>sir wen moon? — every degen ever</div>
              </div>
            </div>
          </div>
        )}

        {easterEgg === 'gm' && (
          <div className="easter-egg-overlay" onClick={() => setEasterEgg(null)}>
            <div className="easter-egg-content gm-mode">
              <div className="meme-text">
                <div style={{ fontSize: 80 }}>☀️</div>
                <div className="meme-big">GM ser!</div>
                <div className="meme-sub">Have a profitable day anon 📈</div>
              </div>
            </div>
          </div>
        )}

        {easterEgg === 'ngmi' && (
          <div className="easter-egg-overlay" onClick={() => setEasterEgg(null)}>
            <div className="easter-egg-content ngmi-mode">
              <div className="meme-text">
                <div style={{ fontSize: 80 }}>💀</div>
                <div className="meme-big">NGMI</div>
                <div className="meme-sub">You bought the top, didn't you?</div>
                <div className="meme-sub" style={{ marginTop: 8, opacity: 0.5 }}>"It's not a loss if you don't sell" — 📉</div>
              </div>
            </div>
          </div>
        )}

        {easterEgg === 'wagmi' && (
          <div className="easter-egg-overlay" onClick={() => setEasterEgg(null)}>
            <div className="easter-egg-content wagmi-mode">
              <div className="meme-text">
                <div style={{ fontSize: 60 }}>💎🙌</div>
                <div className="meme-big">DIAMOND HANDS</div>
                <div className="meme-sub">You found the secret! WAGMI fren 🤝</div>
                <div className="meme-sub" style={{ marginTop: 8, opacity: 0.6 }}>Built different. Powered by SolRadar.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
