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

const MAX_HISTORY = 60;

export default function CryptoTicker() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/crypto', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch crypto prices');
        const data = await res.json();

        setPrices(prev => {
          const updated: Record<string, CryptoPrice> = { ...prev };

          for (const coin of data.prices || []) {
            const price = Number(coin.price) || 0;
            const change24h = Number(coin.change24h) || 0;
            const history = updated[coin.id]?.priceHistory || [];
            const newHistory = [...history, price].slice(-MAX_HISTORY);
            updated[coin.id] = {
              id: coin.id,
              symbol: coin.symbol,
              price,
              change24h,
              priceHistory: newHistory.length > 0 ? newHistory : [price],
            };
          }

          return updated;
        });
        setConnected(true);
      } catch (err) {
        setConnected(false);
        console.error('Failed to fetch initial prices:', err);
      }
    }

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(fetchPrices, 30 * 1000);
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    function connectWebSocket() {
      const assets = COINS.map(c => c.id).join(',');
      const ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${assets}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        stopPolling();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        setPrices(prev => {
          const updated = { ...prev };

          for (const [coinId, priceStr] of Object.entries(data)) {
            const price = parseFloat(priceStr as string);
            if (updated[coinId]) {
              const newHistory = [...updated[coinId].priceHistory, price].slice(-MAX_HISTORY);
              updated[coinId] = {
                ...updated[coinId],
                price,
                priceHistory: newHistory,
              };
            }
          }

          return updated;
        });
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        startPolling();
      };

      ws.onclose = () => {
        setConnected(false);
        startPolling();
        reconnectRef.current = setTimeout(connectWebSocket, 3000);
      };
    }

    fetchPrices();
    startPolling();
    connectWebSocket();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Crypto Prices
        </h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="text-xs text-gray-400">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {COINS.map(({ id, symbol }) => {
          const coin = prices[id];

          if (!coin || coin.price === 0) {
            return (
              <div key={id} className="bg-gray-50 rounded-lg p-3 animate-pulse border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-12 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            );
          }

          return (
            <div
              key={id}
              className="bg-gray-50 rounded-lg p-3 transition-colors border border-gray-100 hover:border-gray-200"
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
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>

              <div className="text-lg font-semibold text-gray-900 mb-2">
                {formatPrice(coin.price)}
              </div>

              {coin.priceHistory.length > 1 && (
                <Sparkline data={coin.priceHistory} positive={coin.change24h >= 0} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const height = 24;
  const width = 100;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4ade80' : '#f87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: colors[symbol] || '#666' }}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
