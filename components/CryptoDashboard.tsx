'use client';

import { useState, useEffect, useRef } from 'react';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  priceHistory: number[];
}

interface FearGreed {
  value: number;
  classification: string;
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', pair: 'XBTUSD', resultKey: 'XXBTZUSD', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSD', resultKey: 'XETHZUSD', color: '#627EEA' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', pair: 'SOLUSD', resultKey: 'SOLUSD', color: '#00FFA3' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSD', resultKey: 'XDGUSD', color: '#C2A633' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', pair: 'XRPUSD', resultKey: 'XXRPZUSD', color: '#23292F' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', pair: 'ADAUSD', resultKey: 'ADAUSD', color: '#0033AD' },
  { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSD', resultKey: 'AVAXUSD', color: '#E84142' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', pair: 'LINKUSD', resultKey: 'LINKUSD', color: '#2A5ADA' },
];

export default function CryptoDashboard() {
  const [coins, setCoins] = useState<Record<string, CoinData>>({});
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string>('bitcoin');
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch 24h OHLC history
  useEffect(() => {
    async function fetchHistory() {
      const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

      const results = await Promise.allSettled(
        COINS.map(async (coin) => {
          const res = await fetch(
            `https://api.kraken.com/0/public/OHLC?pair=${coin.pair}&interval=15&since=${since}`,
            { cache: 'no-store' }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (data.error?.length > 0) return null;

          const pairKey = Object.keys(data.result).find(k => k !== 'last');
          if (!pairKey) return null;

          const candles = data.result[pairKey] as number[][];
          const closePrices = candles.map((c: number[]) => parseFloat(String(c[4])));
          const highs = candles.map((c: number[]) => parseFloat(String(c[2])));
          const lows = candles.map((c: number[]) => parseFloat(String(c[3])));
          const volumes = candles.map((c: number[]) => parseFloat(String(c[6])));

          return {
            coinId: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            color: coin.color,
            history: closePrices,
            high24h: Math.max(...highs),
            low24h: Math.min(...lows),
            volume24h: volumes.reduce((s, v) => s + v, 0),
          };
        })
      );

      const initial: Record<string, CoinData> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { coinId, symbol, name, history, high24h, low24h, volume24h } = result.value;
          const lastPrice = history[history.length - 1] || 0;
          const firstPrice = history[0] || lastPrice;
          const change24h = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

          initial[coinId] = {
            id: coinId, symbol, name, price: lastPrice,
            change24h, high24h, low24h, volume24h,
            priceHistory: history.slice(-96),
          };
        }
      }

      if (Object.keys(initial).length > 0) {
        setCoins(initial);
        setIsLoaded(true);
      }
    }

    fetchHistory();
  }, []);

  // Live price polling
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

        setCoins(prev => {
          const updated: Record<string, CoinData> = {};
          for (const coin of COINS) {
            const tickerData = data.result?.[coin.resultKey];
            if (tickerData) {
              const price = parseFloat(tickerData.c?.[0]) || 0;
              const open = parseFloat(tickerData.o) || price;
              const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
              const prevData = prev[coin.id];
              const prevHistory = prevData?.priceHistory || [];
              const newHistory = price !== prevHistory[prevHistory.length - 1]
                ? [...prevHistory, price].slice(-96)
                : prevHistory.length > 0 ? prevHistory : [price];

              updated[coin.id] = {
                id: coin.id, symbol: coin.symbol, name: coin.name,
                price, change24h,
                high24h: prevData?.high24h || parseFloat(tickerData.h?.[1]) || price,
                low24h: prevData?.low24h || parseFloat(tickerData.l?.[1]) || price,
                volume24h: prevData?.volume24h || parseFloat(tickerData.v?.[1]) || 0,
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
        console.error('Kraken error:', err);
      }
    }

    const delay = setTimeout(() => {
      fetchPrices();
      intervalRef.current = setInterval(fetchPrices, 2000);
    }, 2000);

    return () => {
      clearTimeout(delay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Fear & Greed Index
  useEffect(() => {
    async function fetchFearGreed() {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.data?.[0];
        if (item) {
          setFearGreed({ value: parseInt(item.value), classification: item.value_classification });
        }
      } catch (err) {
        console.error('Fear & Greed error:', err);
      }
    }
    fetchFearGreed();
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVol = (v: number): string => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100 h-40" />
        ))}
      </div>
    );
  }

  const selected = coins[selectedCoin];
  const coinConfig = COINS.find(c => c.id === selectedCoin);

  return (
    <div className="space-y-4">
      {/* Top row: Fear & Greed + Featured coin chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fear & Greed Gauge */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Fear & Greed Index</div>
          {fearGreed ? (
            <>
              <FearGreedGauge value={fearGreed.value} />
              <div className="text-3xl font-bold mt-3" style={{
                color: fearGreed.value <= 25 ? '#ef4444' : fearGreed.value <= 45 ? '#f59e0b' :
                  fearGreed.value <= 55 ? '#6b7280' : fearGreed.value <= 75 ? '#84cc16' : '#22c55e'
              }}>
                {fearGreed.value}
              </div>
              <div className="text-sm text-gray-600 font-medium">{fearGreed.classification}</div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">Loading...</div>
          )}
        </div>

        {/* Featured coin large chart */}
        <div className="lg:col-span-2 bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: coinConfig?.color || '#666' }}>
                {selected?.symbol?.slice(0, 2)}
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{selected?.name}</div>
                <div className="text-xs text-gray-500">{selected?.symbol}/USD</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{formatPrice(selected?.price || 0)}</div>
              <div className={`text-sm font-semibold ${(selected?.change24h || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(selected?.change24h || 0) >= 0 ? '+' : ''}{(selected?.change24h || 0).toFixed(2)}%
              </div>
            </div>
          </div>
          {selected && <LargeChart data={selected.priceHistory} positive={selected.change24h >= 0} color={coinConfig?.color || '#22c55e'} />}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <div className="text-xs text-gray-500">24h High</div>
              <div className="text-sm font-semibold text-gray-900">{formatPrice(selected?.high24h || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">24h Low</div>
              <div className="text-sm font-semibold text-gray-900">{formatPrice(selected?.low24h || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">24h Volume</div>
              <div className="text-sm font-semibold text-gray-900">{formatVol(selected?.volume24h || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Coin grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {COINS.map(({ id, symbol, name, color }) => {
          const coin = coins[id];
          if (!coin) return null;
          const isSelected = id === selectedCoin;

          return (
            <button
              key={id}
              onClick={() => setSelectedCoin(id)}
              className={`rounded-xl p-4 border transition-all text-left ${
                isSelected
                  ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                  : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: color }}>
                    {symbol.slice(0, 1)}
                  </div>
                  <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>{symbol}</span>
                </div>
                <span className={`text-xs font-semibold ${
                  coin.change24h >= 0
                    ? isSelected ? 'text-green-400' : 'text-green-600'
                    : isSelected ? 'text-red-400' : 'text-red-500'
                }`}>
                  {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                </span>
              </div>
              <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(coin.price)}
              </div>
              <div className="mt-2">
                <MiniChart data={coin.priceHistory} positive={coin.change24h >= 0} light={isSelected} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FearGreedGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <svg width="160" height="90" viewBox="0 0 160 90">
      {/* Background arc */}
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#6b7280" />
          <stop offset="75%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
      <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * 204} 204`} />
      {/* Needle */}
      <line
        x1="80" y1="80"
        x2={80 + Math.cos((angle * Math.PI) / 180) * 50}
        y2={80 - Math.sin((-angle * Math.PI) / 180) * 50}
        stroke="#111" strokeWidth="2.5" strokeLinecap="round"
      />
      <circle cx="80" cy="80" r="4" fill="#111" />
    </svg>
  );
}

function LargeChart({ data, positive, color }: { data: number[]; positive: boolean; color: string }) {
  if (data.length < 2) return <div className="h-32 bg-gray-100 rounded" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 140;
  const width = 500;
  const padding = 4;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="largeGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#largeGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} />
    </svg>
  );
}

function MiniChart({ data, positive, light }: { data: number[]; positive: boolean; light?: boolean }) {
  if (data.length < 2) return <div className="h-8 bg-gray-100 rounded" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 32;
  const width = 100;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = 2 + (1 - (val - min) / range) * (height - 4);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const color = positive ? (light ? '#86efac' : '#22c55e') : (light ? '#fca5a5' : '#ef4444');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
