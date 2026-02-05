'use client';

import { useState, useEffect, useMemo } from 'react';
import Treemap from './Treemap';
import FilterBar from './FilterBar';
import CryptoTicker from './CryptoTicker';
import { Market, ApiResponse } from '@/lib/types';
import { buildTreemapData } from '@/lib/utils';

export default function Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['polymarket', 'kalshi']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/markets');
        if (!res.ok) throw new Error('Failed to fetch');
        const data: ApiResponse = await res.json();
        setMarkets(data.markets);
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
        setError(null);
      } catch (err) {
        setError('Failed to load market data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function updateDimensions() {
      const container = document.getElementById('treemap-container');
      if (container) {
        const width = container.clientWidth || window.innerWidth - 40;
        const height = Math.max(600, window.innerHeight - 320);
        setDimensions({ width, height });
      }
    }

    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [loading]);

  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      const platformMatch = selectedPlatforms.includes(m.platform);
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(m.category);
      return platformMatch && categoryMatch;
    });
  }, [markets, selectedPlatforms, selectedCategories]);

  const treemapData = useMemo(() => {
    return buildTreemapData(filteredMarkets, 'category');
  }, [filteredMarkets]);

  const totalVolume = useMemo(() => {
    return filteredMarkets.reduce((sum, m) => sum + m.volume, 0);
  }, [filteredMarkets]);

  const categories = useMemo(() => {
    const cats = new Set(markets.map(m => m.category));
    return Array.from(cats).sort();
  }, [markets]);

  const handleMarketClick = (market: Market) => {
    window.open(market.url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-500 text-sm">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (error) {
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
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Prediction Markets
          </h1>
          <p className="text-gray-500 text-sm">
            Volume from Polymarket & Kalshi
            <span className="ml-3 text-gray-400">
              Updated {lastUpdated}
            </span>
          </p>
        </div>

        {/* Crypto Prices */}
        <CryptoTicker />

        {/* Filters */}
        <FilterBar
          platforms={['polymarket', 'kalshi']}
          selectedPlatforms={selectedPlatforms}
          onPlatformChange={setSelectedPlatforms}
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          totalVolume={totalVolume}
          marketCount={filteredMarkets.length}
        />

        {/* Treemap */}
        <div id="treemap-container" className="w-full" style={{ minHeight: '600px' }}>
          {dimensions.width > 0 && dimensions.height > 0 && (
            <Treemap
              data={treemapData}
              width={dimensions.width}
              height={dimensions.height}
              onMarketClick={handleMarketClick}
              totalVolume={totalVolume}
            />
          )}
          {dimensions.width === 0 && (
            <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
              Loading treemap...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-400 text-xs">
          Data from Polymarket & Kalshi APIs. Click any market to view details.
        </div>
      </div>
    </div>
  );
}
