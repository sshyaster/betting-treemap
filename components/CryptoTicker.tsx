'use client';

import { useState, useEffect, useRef } from 'react';

interface CryptoPrice {
  id: string;
  symbol: string;
  price: number;
  prevPrice: number;
  change24h: number;
  priceHistory: number[];
}

// Kraken pairs - using their actual response key names
const COINS = [
  { id: 'bitcoin', symbol: 'BTC', pair: 'XBTUSD', resultKey: 'XXBTZUSD' },
  { id: 'ethereum', symbol: 'ETH', pair: 'ETHUSD', resultKey: 'XETHZUSD' },
  { id: 'solana', symbol: 'SOL', pair: 'SOLUSD', resultKey: 'SOLUSD' },
  { id: 'dogecoin', symbol: 'DOGE', pair: 'DOGEUSD', resultKey: 'XDGUSD' },
  { id: 'xrp', symbol: 'XRP', pair: 'XRPUSD', resultKey: 'XXRPZUSD' },
  { id: 'cardano', symbol: 'ADA', pair: 'ADAUSD', resultKey: 'ADAUSD' },
];

const MAX_HISTORY = 96; // 24h of 15-min candles

export default function CryptoTicker() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch 24h of OHLC history on mount
  useEffect(() => {
    async function fetchHistory() {
      const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60; // 24h ago

      const results = await Promise.allSettled(
        COINS.map(async (coin) => {
          const res = await fetch(
            `https://api.kraken.com/0/public/OHLC?pair=${coin.pair}&interval=15&since=${since}`,
            { cache: 'no-store' }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (data.error?.length > 0) return null;

          // OHLC result is keyed by pair name, value is array of candles
          // Each candle: [time, open, high, low, close, vwap, volume, count]
          const pairKey = Object.keys(data.result).find(k => k !== 'last');
          if (!pairKey) return null;

          const candles = data.result[pairKey] as number[][];
          const closePrices = candles.map((c: number[]) => parseFloat(String(c[4])));

          return { coinId: coin.id, symbol: coin.symbol, history: closePrices };
        })
      );

      const initial: Record<string, CryptoPrice> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { coinId, symbol, history } = result.value;
          const lastPrice = history[history.length - 1] || 0;
          const firstPrice = history[0] || lastPrice;
          const change24h = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

          initial[coinId] = {
            id: coinId,
            symbol,
            price: lastPrice,
            prevPrice: lastPrice,
            change24h,
            priceHistory: history.slice(-MAX_HISTORY),
          };
        }
      }

      if (Object.keys(initial).length > 0) {
        setPrices(initial);
        setIsLoaded(true);
      }
    }

    fetchHistory();
  }, []);

  // Live polling for current prices
  useEffect(() => {
    async function fetchPrices() {
      try {
        const pairs = COINS.map(c => c.pair).join(',');
        const res = await fetch(
          `https://api.kraken.com/0/public/Ticker?pair=${pairs}`,
          { cache: 'no-store' }
        );

        if (!res.ok) return;
        const data = await res.json();

        if (data.error?.length > 0) return;

        setPrices(prev => {
          const updated: Record<string, CryptoPrice> = {};

          for (const coin of COINS) {
            const tickerData = data.result?.[coin.resultKey];

            if (tickerData) {
              const price = parseFloat(tickerData.c?.[0]) || 0;
              const open = parseFloat(tickerData.o) || price;
              const change24h = open > 0 ? ((price - open) / open) * 100 : 0;

              const prevPrice = prev[coin.id]?.price || price;
              const prevHistory = prev[coin.id]?.priceHistory || [];

              // Append new price point if it changed
              const newHistory = price !== prevHistory[prevHistory.length - 1]
                ? [...prevHistory, price].slice(-MAX_HISTORY)
                : prevHistory.length > 0 ? prevHistory : [price];

              updated[coin.id] = {
                id: coin.id,
                symbol: coin.symbol,
                price,
                prevPrice,
                change24h,
                priceHistory: newHistory,
              };
            } else if (prev[coin.id]) {
              updated[coin.id] = prev[coin.id];
            }
          }

          return updated;
        });

        setIsLoaded(true);
      } catch (err) {
        console.error('Kraken fetch error:', err);
      }
    }

    // Start polling after a short delay (let history load first)
    const startDelay = setTimeout(() => {
      fetchPrices();
      intervalRef.current = setInterval(fetchPrices, 1000);
    }, 2000);

    return () => {
      clearTimeout(startDelay);
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
              className={`bg-gray-50 rounded-lg p-3 border transition-all duration-150 ${
                priceUp ? 'border-green-300 bg-green-50/50' :
                priceDown ? 'border-red-300 bg-red-50/50' :
                'border-gray-100'
              }`}
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

              <div
                className={`text-lg font-semibold mb-2 transition-colors duration-150 ${
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

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const color = positive ? '#22c55e' : '#ef4444';

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
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
