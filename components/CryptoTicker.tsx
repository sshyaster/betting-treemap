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

interface CryptoTickerProps {
  dark?: boolean;
}

export default function CryptoTicker({ dark = false }: CryptoTickerProps) {
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
      <div className={`rounded-lg p-4 mb-4 border ${dark ? 'bg-[#1a1d27] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {COINS.map(({ id }) => (
            <div key={id} className={`rounded-lg p-3 animate-pulse border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
              <div className={`h-4 rounded w-12 mb-2 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-6 rounded w-20 mb-2 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-10 rounded w-full ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 mb-4 border ${dark ? 'bg-[#1a1d27] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {COINS.map(({ id, symbol }) => {
          const coin = prices[id];
          if (!coin) return null;

          const priceUp = coin.price > coin.prevPrice;
          const priceDown = coin.price < coin.prevPrice;

          return (
            <div
              key={id}
              className={`rounded-lg p-3 border transition-all duration-150 ${
                priceUp ? (dark ? 'border-green-700 bg-green-900/30' : 'border-green-300 bg-green-50/50') :
                priceDown ? (dark ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50/50') :
                (dark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50')
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={symbol} />
                  <span className={`font-medium text-sm ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{symbol}</span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    coin.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {coin.change24h >= 0 ? '+' : ''}
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>

              <div
                className={`text-lg font-semibold mb-2 transition-colors duration-150 ${
                  priceUp ? 'text-green-500' : priceDown ? 'text-red-500' : (dark ? 'text-gray-100' : 'text-gray-900')
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

// Crypto logo SVGs
function CryptoIcon({ symbol }: { symbol: string }) {
  const size = 20;

  switch (symbol) {
    case 'BTC':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path fill="#fff" d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .1 0l-.1 0-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.5.7l.9-3.4c1 .2 4.1.7 3.6 2.7z"/>
        </svg>
      );
    case 'ETH':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path fill="#fff" fillOpacity=".6" d="M16 4v8.9l7.5 3.3z" />
          <path fill="#fff" d="M16 4L8.5 16.2l7.5-3.3z" />
          <path fill="#fff" fillOpacity=".6" d="M16 21.9v6.1l7.5-10.4z" />
          <path fill="#fff" d="M16 28v-6.1l-7.5-4.3z" />
          <path fill="#fff" fillOpacity=".2" d="M16 20.6l7.5-4.4L16 12.9z" />
          <path fill="#fff" fillOpacity=".6" d="M8.5 16.2l7.5 4.4v-7.7z" />
        </svg>
      );
    case 'SOL':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#000" />
          <defs><linearGradient id="sol-g" x1="5" y1="25" x2="27" y2="7" gradientUnits="userSpaceOnUse"><stop stopColor="#9945FF"/><stop offset="0.5" stopColor="#19FB9B"/><stop offset="1" stopColor="#00D1FF"/></linearGradient></defs>
          <path d="M9.5 20.7c.1-.1.3-.2.5-.2h14.4c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z" fill="url(#sol-g)"/>
          <path d="M9.5 8.5c.1-.1.3-.2.5-.2h14.4c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z" fill="url(#sol-g)"/>
          <path d="M22.3 14.5c-.1-.1-.3-.2-.5-.2H7.4c-.3 0-.5.4-.3.6l2.4 2.4c.1.1.3.2.5.2h14.4c.3 0 .5-.4.3-.6l-2.4-2.4z" fill="url(#sol-g)"/>
        </svg>
      );
    case 'DOGE':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#C2A633" />
          <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="Arial">D</text>
        </svg>
      );
    case 'XRP':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#23292F" />
          <path fill="#fff" d="M23.1 8h2.8l-5.5 5.4a6.2 6.2 0 01-8.8 0L6.1 8h2.8l4.1 4.1a4 4 0 005.6 0L23.1 8zM8.9 24H6.1l5.5-5.4a6.2 6.2 0 018.8 0L25.9 24h-2.8l-4.1-4.1a4 4 0 00-5.6 0L8.9 24z"/>
        </svg>
      );
    case 'ADA':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <circle cx="16" cy="16" r="16" fill="#0033AD" />
          <circle cx="16" cy="10" r="1.8" fill="#fff"/>
          <circle cx="16" cy="22" r="1.8" fill="#fff"/>
          <circle cx="10" cy="13" r="1.5" fill="#fff"/>
          <circle cx="22" cy="13" r="1.5" fill="#fff"/>
          <circle cx="10" cy="19" r="1.5" fill="#fff"/>
          <circle cx="22" cy="19" r="1.5" fill="#fff"/>
          <circle cx="16" cy="16" r="2.5" fill="#fff"/>
        </svg>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gray-500 flex-shrink-0">
          {symbol.slice(0, 1)}
        </div>
      );
  }
}
