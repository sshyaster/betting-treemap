'use client';

import { useState, useEffect, useRef } from 'react';

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  priceHistory: number[];
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'ADAUSDT'];
const DISPLAY_NAMES: Record<string, string> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  SOLUSDT: 'SOL',
  DOGEUSDT: 'DOGE',
  XRPUSDT: 'XRP',
  ADAUSDT: 'ADA',
};

const MAX_HISTORY = 60; // Keep last 60 price points for chart

export default function CryptoTicker() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize prices
    const initial: Record<string, CryptoPrice> = {};
    SYMBOLS.forEach(s => {
      initial[s] = { symbol: s, price: 0, change24h: 0, priceHistory: [] };
    });
    setPrices(initial);

    // Connect to Binance WebSocket (combined streams)
    const streams = SYMBOLS.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('Binance WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const data = message.data || message; // Handle both combined and single stream format
      const symbol = data.s; // Symbol like "BTCUSDT"
      const price = parseFloat(data.c); // Current price
      const change24h = parseFloat(data.P); // 24h change percent

      setPrices(prev => {
        const current = prev[symbol];
        if (!current) return prev;

        const newHistory = [...current.priceHistory, price].slice(-MAX_HISTORY);

        return {
          ...prev,
          [symbol]: {
            symbol,
            price,
            change24h,
            priceHistory: newHistory,
          },
        };
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Crypto Prices
        </h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {SYMBOLS.map((symbol) => {
          const coin = prices[symbol];
          if (!coin || coin.price === 0) {
            return (
              <div key={symbol} className="bg-gray-900 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-12 mb-2" />
                <div className="h-6 bg-gray-700 rounded w-20" />
              </div>
            );
          }

          return (
            <div
              key={symbol}
              className="bg-gray-900 rounded-lg p-3 hover:bg-gray-850 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={DISPLAY_NAMES[symbol]} />
                  <span className="font-semibold text-white text-sm">
                    {DISPLAY_NAMES[symbol]}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    coin.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {coin.change24h >= 0 ? '+' : ''}
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>

              <div className="text-lg font-bold text-white mb-2">
                {formatPrice(coin.price)}
              </div>

              {/* Mini sparkline chart */}
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
