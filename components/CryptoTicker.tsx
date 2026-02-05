'use client';

import { useState, useEffect, useRef } from 'react';

interface CryptoPrice {
  id: string;
  symbol: string;
  price: number;
  change24h: number;
  priceHistory: number[];
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'xrp', symbol: 'XRP' },
  { id: 'cardano', symbol: 'ADA' },
];

const MAX_HISTORY = 30;

export default function CryptoTicker() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const ids = COINS.map(c => c.id).join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { cache: 'no-store' }
        );

        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        setPrices(prev => {
          const updated: Record<string, CryptoPrice> = {};

          for (const coin of COINS) {
            const price = data[coin.id]?.usd || 0;
            const change24h = data[coin.id]?.usd_24h_change || 0;
            const prevHistory = prev[coin.id]?.priceHistory || [];

            // Only add to history if price changed
            const lastPrice = prevHistory[prevHistory.length - 1];
            const newHistory = lastPrice !== price
              ? [...prevHistory, price].slice(-MAX_HISTORY)
              : prevHistory.length > 0 ? prevHistory : [price];

            updated[coin.id] = {
              id: coin.id,
              symbol: coin.symbol,
              price,
              change24h,
              priceHistory: newHistory,
            };
          }

          return updated;
        });

        setIsLoaded(true);
      } catch (err) {
        console.error('Crypto fetch error:', err);
      }
    }

    // Initial fetch
    fetchPrices();

    // Poll every 10 seconds
    intervalRef.current = setInterval(fetchPrices, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  if (!isLoaded) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {COINS.map(({ id }) => (
            <div key={id} className="bg-gray-50 rounded-lg p-3 animate-pulse border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-12 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {COINS.map(({ id, symbol }) => {
          const coin = prices[id];
          if (!coin) return null;

          return (
            <div
              key={id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={symbol} />
                  <span className="font-medium text-gray-900 text-sm">{symbol}</span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    coin.change24h >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {coin.change24h >= 0 ? '+' : ''}
                  {coin.change24h.toFixed(1)}%
                </span>
              </div>

              <div className="text-lg font-semibold text-gray-900 mb-2">
                {formatPrice(coin.price)}
              </div>

              <MiniChart data={coin.priceHistory} positive={coin.change24h >= 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniChart({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) {
    return <div className="h-10 bg-gray-100 rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const height = 40;
  const width = 100;
  const padding = 2;

  // Create smooth path
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Create SVG path with smooth curves
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x + (cpx - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
    path += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const areaPath = path + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const color = positive ? '#22c55e' : '#ef4444';
  const fillColor = positive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${positive ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#gradient-${positive ? 'up' : 'down'})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={color}
      />
    </svg>
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
      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ backgroundColor: colors[symbol] || '#666' }}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
