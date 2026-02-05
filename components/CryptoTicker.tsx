'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface CryptoPrice {
  id: string;
  symbol: string;
  price: number;
  prevPrice: number;
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

const MAX_HISTORY = 50;

export default function CryptoTicker() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data with 24h change from CoinGecko
  const fetchInitialData = useCallback(async () => {
    try {
      const ids = COINS.map(c => c.id).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) return;
      const data = await res.json();

      setPrices(prev => {
        const updated: Record<string, CryptoPrice> = {};
        for (const coin of COINS) {
          const price = data[coin.id]?.usd || prev[coin.id]?.price || 0;
          const change24h = data[coin.id]?.usd_24h_change || prev[coin.id]?.change24h || 0;
          updated[coin.id] = {
            id: coin.id,
            symbol: coin.symbol,
            price,
            prevPrice: price,
            change24h,
            priceHistory: prev[coin.id]?.priceHistory || [price],
          };
        }
        return updated;
      });
      setIsLoaded(true);
    } catch (err) {
      console.error('Initial fetch error:', err);
    }
  }, []);

  // Connect to CoinCap WebSocket for real-time prices
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const assets = COINS.map(c => c.id).join(',');
    const ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${assets}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setPrices(prev => {
          const updated = { ...prev };
          let hasChanges = false;

          for (const [coinId, priceStr] of Object.entries(data)) {
            const price = parseFloat(priceStr as string);
            if (updated[coinId] && price > 0) {
              hasChanges = true;
              const prevPrice = updated[coinId].price;
              const newHistory = [...updated[coinId].priceHistory, price].slice(-MAX_HISTORY);

              updated[coinId] = {
                ...updated[coinId],
                price,
                prevPrice,
                priceHistory: newHistory,
              };
            }
          }

          return hasChanges ? updated : prev;
        });
      } catch (err) {
        // Silently ignore parse errors
      }
    };

    ws.onclose = () => {
      // Silently reconnect after 2 seconds
      reconnectTimeout.current = setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();

    // Refresh 24h change every 60 seconds
    const interval = setInterval(fetchInitialData, 60000);

    return () => {
      clearInterval(interval);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [fetchInitialData, connectWebSocket]);

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
              <div className="h-10 bg-gray-100 rounded w-full" />
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

          const priceUp = coin.price > coin.prevPrice;
          const priceDown = coin.price < coin.prevPrice;

          return (
            <div
              key={id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-100 transition-colors"
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

              <div
                className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                  priceUp ? 'text-green-600' : priceDown ? 'text-red-500' : 'text-gray-900'
                }`}
              >
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

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Simple line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const color = positive ? '#22c55e' : '#ef4444';

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${positive})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
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
