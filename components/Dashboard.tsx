'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Treemap from './Treemap';
import CryptoTicker from './CryptoTicker';
import CryptoDashboard from './CryptoDashboard';
import Insights from './Insights';
import DataTable from './DataTable';
import TwitterFeed from './TwitterFeed';
import AuthButton from './AuthButton';
import { Market, ApiResponse, Timeframe } from '@/lib/types';
import { buildTreemapData, getVolumeForTimeframe } from '@/lib/utils';

type Platform = 'polymarket' | 'kalshi';
type Tab = 'markets' | 'crypto' | 'feed' | 'insights' | 'data';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'All' },
  { key: 'oi', label: 'OI' },
];

const TABS: { key: Tab; label: string }[] = [
  { key: 'markets', label: 'Markets' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'feed', label: 'Feed' },
  { key: 'insights', label: 'Insights' },
  { key: 'data', label: 'Data' },
];

export default function Dashboard() {
  const [polyMarkets, setPolyMarkets] = useState<Market[]>([]);
  const [kalshiMarkets, setKalshiMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [kalshiLoading, setKalshiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [platform, setPlatform] = useState<Platform>('polymarket');
  const [tab, setTab] = useState<Tab>('markets');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dark, setDark] = useState(false);

  // Load dark mode from localStorage or detect system preference
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDark(saved === 'true');
    } else {
      // No saved preference — detect system dark mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDark(prefersDark);
    }
  }, []);

  // Apply dark class to root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  // Fetch Polymarket data
  useEffect(() => {
    async function fetchPolymarket() {
      try {
        setLoading(true);
        const res = await fetch('/api/markets');
        if (!res.ok) throw new Error('Failed to fetch');
        const data: ApiResponse = await res.json();
        setPolyMarkets(data.markets);
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
        setError(null);
      } catch (err) {
        setError('Failed to load market data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPolymarket();
    const interval = setInterval(fetchPolymarket, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Kalshi data
  useEffect(() => {
    async function fetchKalshi() {
      try {
        setKalshiLoading(true);
        const res = await fetch('/api/kalshi');
        if (!res.ok) throw new Error('Failed to fetch Kalshi');
        const data: ApiResponse = await res.json();
        setKalshiMarkets(data.markets);
      } catch (err) {
        console.error('Kalshi fetch error:', err);
      } finally {
        setKalshiLoading(false);
      }
    }

    fetchKalshi();
    const interval = setInterval(fetchKalshi, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function updateDimensions() {
      const container = document.getElementById('treemap-container');
      if (container) {
        const width = container.clientWidth || window.innerWidth - 32;
        const height = Math.max(500, window.innerHeight - 300);
        setDimensions({ width, height });
      }
    }

    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [loading, tab]);

  const currentMarkets = platform === 'polymarket' ? polyMarkets : kalshiMarkets;
  const isCurrentLoading = platform === 'polymarket' ? loading : kalshiLoading;

  const treemapData = useMemo(() => {
    return buildTreemapData(currentMarkets, timeframe);
  }, [currentMarkets, timeframe]);

  const totalVolume = useMemo(() => {
    return currentMarkets.reduce((sum, m) => sum + getVolumeForTimeframe(m, timeframe), 0);
  }, [currentMarkets, timeframe]);

  const handleMarketClick = useCallback((market: Market) => {
    window.open(market.url, '_blank');
  }, []);

  if (loading && kalshiLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${dark ? 'bg-[#0f1117]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-500 text-sm">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (error && platform === 'polymarket' && tab === 'markets') {
    return (
      <div className={`flex items-center justify-center h-screen ${dark ? 'bg-[#0f1117]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <div className="text-gray-500 text-sm mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${dark ? 'bg-[#0f1117]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4">
          {/* Top row: controls */}
          <div className="flex items-center justify-end py-2.5">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Platform toggle (markets tab) */}
              {tab === 'markets' && (
                <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => { setPlatform('polymarket'); if (timeframe === 'oi') setTimeframe('24h'); }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition flex items-center gap-1 ${
                      platform === 'polymarket' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="hidden sm:inline">Polymarket</span>
                    <span className="sm:hidden">Poly</span>
                  </button>
                  <button
                    onClick={() => { setPlatform('kalshi'); setTimeframe('oi'); }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition flex items-center gap-1 ${
                      platform === 'kalshi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Kalshi
                  </button>
                </div>
              )}

              {/* Timeframe toggle */}
              {(tab === 'markets' || tab === 'insights' || tab === 'data') && (
                <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeframe(tf.key)}
                      className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition ${
                        timeframe === tf.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Auth */}
              <AuthButton dark={dark} />

              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(d => !d)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? '☀' : '☾'}
              </button>

              <span className="text-[10px] text-gray-500 hidden lg:block whitespace-nowrap">
                Updated {lastUpdated}
              </span>
            </div>
          </div>

          {/* Tab row */}
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none pb-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.key
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Markets Tab */}
        {tab === 'markets' && (
          <>
            <CryptoTicker dark={dark} />
            <div id="treemap-container" className="w-full mt-3 overflow-x-auto" style={{ minHeight: '500px' }}>
              {isCurrentLoading ? (
                <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
                    Loading {platform === 'kalshi' ? 'Kalshi' : 'Polymarket'} data...
                  </div>
                </div>
              ) : dimensions.width > 0 && dimensions.height > 0 ? (
                <div style={{ minWidth: '700px' }}>
                  <Treemap
                    data={treemapData}
                    width={Math.max(700, dimensions.width)}
                    height={dimensions.height}
                    onMarketClick={handleMarketClick}
                    totalVolume={totalVolume}
                    timeframeLabel={TIMEFRAMES.find(t => t.key === timeframe)?.label || '24h'}
                    dark={dark}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400 text-sm">Loading treemap...</div>
              )}
            </div>
            <div className={`mt-3 text-center text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              Data from {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'} API · Click any market to view
            </div>

            {/* Insights summary below treemap */}
            <div className="mt-6">
              <Insights polyMarkets={polyMarkets} kalshiMarkets={kalshiMarkets} timeframe={timeframe} dark={dark} />
            </div>
          </>
        )}

        {tab === 'crypto' && <CryptoDashboard dark={dark} />}

        {tab === 'feed' && <TwitterFeed dark={dark} />}

        {tab === 'insights' && (
          <Insights polyMarkets={polyMarkets} kalshiMarkets={kalshiMarkets} timeframe={timeframe} dark={dark} />
        )}

        {tab === 'data' && (
          <DataTable polyMarkets={polyMarkets} kalshiMarkets={kalshiMarkets} timeframe={timeframe} dark={dark} />
        )}
      </main>
    </div>
  );
}
