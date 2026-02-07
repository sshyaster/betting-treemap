'use client';

import { useState, useEffect, useMemo } from 'react';
import Treemap from './Treemap';
import CryptoTicker from './CryptoTicker';
import CryptoDashboard from './CryptoDashboard';
import Insights from './Insights';
import { Market, ApiResponse, Timeframe } from '@/lib/types';
import { buildTreemapData, getVolumeForTimeframe } from '@/lib/utils';

type Platform = 'polymarket' | 'kalshi';
type Tab = 'markets' | 'crypto' | 'insights';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'All' },
];

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'markets', label: 'Markets', icon: '◧' },
  { key: 'crypto', label: 'Crypto', icon: '◈' },
  { key: 'insights', label: 'Insights', icon: '◉' },
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
        const width = container.clientWidth || window.innerWidth - 40;
        const height = Math.max(600, window.innerHeight - 300);
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

  const handleMarketClick = (market: Market) => {
    window.open(market.url, '_blank');
  };

  if (loading && kalshiLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-500 text-sm">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (error && platform === 'polymarket' && tab === 'markets') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <div className="text-gray-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-[1800px] mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-6">
              <h1 className="text-base font-bold tracking-tight">
                <span className="text-white">Prediction</span>
                <span className="text-gray-400">Markets</span>
              </h1>
              {/* Tabs */}
              <nav className="flex items-center gap-1">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                      tab === t.key
                        ? 'bg-white/15 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="mr-1.5">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Platform toggle (only on markets tab) */}
              {tab === 'markets' && (
                <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setPlatform('polymarket')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                      platform === 'polymarket'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                    Polymarket
                  </button>
                  <button
                    onClick={() => setPlatform('kalshi')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                      platform === 'kalshi'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Kalshi
                  </button>
                </div>
              )}

              {/* Timeframe toggle */}
              {(tab === 'markets' || tab === 'insights') && (
                <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeframe(tf.key)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition ${
                        timeframe === tf.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500 hidden sm:block">
                Updated {lastUpdated}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-4 py-4">
        {/* Markets Tab */}
        {tab === 'markets' && (
          <>
            <CryptoTicker />
            <div id="treemap-container" className="w-full mt-3" style={{ minHeight: '600px' }}>
              {isCurrentLoading ? (
                <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
                    Loading {platform === 'kalshi' ? 'Kalshi' : 'Polymarket'} data...
                  </div>
                </div>
              ) : dimensions.width > 0 && dimensions.height > 0 ? (
                <Treemap
                  data={treemapData}
                  width={dimensions.width}
                  height={dimensions.height}
                  onMarketClick={handleMarketClick}
                  totalVolume={totalVolume}
                  timeframeLabel={TIMEFRAMES.find(t => t.key === timeframe)?.label || '24h'}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                  Loading treemap...
                </div>
              )}
            </div>
            <div className="mt-3 text-center text-gray-400 text-xs">
              Data from {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'} API &middot; Click any market to view
            </div>
          </>
        )}

        {/* Crypto Tab */}
        {tab === 'crypto' && <CryptoDashboard />}

        {/* Insights Tab */}
        {tab === 'insights' && (
          <Insights
            polyMarkets={polyMarkets}
            kalshiMarkets={kalshiMarkets}
            timeframe={timeframe}
          />
        )}
      </main>
    </div>
  );
}
