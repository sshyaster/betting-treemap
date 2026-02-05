'use client';

import { useState, useEffect, useMemo } from 'react';
import Treemap from './Treemap';
import FilterBar from './FilterBar';
import CryptoTicker from './CryptoTicker';
import { Market, ApiResponse } from '@/lib/types';
import { buildTreemapData, formatVolume, CATEGORY_COLORS } from '@/lib/utils';

export default function Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['polymarket', 'kalshi']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Fetch data
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
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // Handle resize
  useEffect(() => {
    function updateDimensions() {
      const container = document.getElementById('treemap-container');
      if (container) {
        const width = container.clientWidth || window.innerWidth - 40;
        const height = Math.max(600, window.innerHeight - 300);
        console.log('Dimensions:', width, height);
        setDimensions({ width, height });
      }
    }

    // Delay to ensure DOM is ready
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [loading]); // Re-run when loading changes

  // Filter and process data
  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      const platformMatch = selectedPlatforms.includes(m.platform);
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(m.category);
      return platformMatch && categoryMatch;
    });
  }, [markets, selectedPlatforms, selectedCategories]);

  const treemapData = useMemo(() => {
    const data = buildTreemapData(filteredMarkets, 'category');
    console.log('TreemapData:', data, 'filteredMarkets:', filteredMarkets.length);
    return data;
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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-400">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">Error</div>
          <div className="text-gray-400">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Prediction Markets Volume
          </h1>
          <p className="text-gray-400">
            Live betting market volumes from Polymarket & Kalshi
            <span className="ml-3 text-gray-500 text-sm">
              Last updated: {lastUpdated}
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
            />
          )}
          {dimensions.width === 0 && (
            <div className="flex items-center justify-center h-96 text-gray-500">
              Loading treemap...
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 flex-wrap text-sm">
          {categories.slice(0, 8).map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: CATEGORY_COLORS[cat] || '#666' }}
              />
              <span className="text-gray-400">{cat}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          Data from Polymarket & Kalshi APIs. Box size = trading volume.
          <br />
          Click any market to view on the original platform.
        </div>
      </div>
    </div>
  );
}
