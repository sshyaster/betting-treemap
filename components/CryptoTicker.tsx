'use client';

import { useState, useEffect } from 'react';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
}

export default function CryptoTicker() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/crypto');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setPrices(data.prices);
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
      } catch (err) {
        console.error('Crypto fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(3)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatMarketCap = (cap: number): string => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading crypto prices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Crypto Prices
        </h2>
        <span className="text-xs text-gray-500">Updated: {lastUpdated}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {prices.map((coin) => (
          <div
            key={coin.id}
            className="bg-gray-900 rounded-lg p-3 hover:bg-gray-850 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <CryptoIcon symbol={coin.symbol} />
              <span className="font-semibold text-white text-sm">{coin.symbol}</span>
            </div>

            <div className="text-lg font-bold text-white">
              {formatPrice(coin.price)}
            </div>

            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs font-medium ${
                  coin.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {coin.change24h >= 0 ? '+' : ''}
                {coin.change24h.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">
                {formatMarketCap(coin.marketCap)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CryptoIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    SOL: '#00FFA3',
    DOGE: '#C2A633',
    XRP: '#23292F',
    ADA: '#0033AD',
  };

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: colors[symbol] || '#666' }}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
