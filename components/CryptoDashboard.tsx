'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CoinSummary {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  color: string;
}

interface FearGreed {
  value: number;
  classification: string;
}

interface CrosshairData {
  candle: Candle;
  x: number;
  y: number;
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', pair: 'XBTUSD', resultKey: 'XXBTZUSD', color: '#F7931A', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSD', resultKey: 'XETHZUSD', color: '#627EEA', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', pair: 'SOLUSD', resultKey: 'SOLUSD', color: '#9945FF', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSD', resultKey: 'XDGUSD', color: '#C2A633', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', pair: 'XRPUSD', resultKey: 'XXRPZUSD', color: '#00AAE4', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', pair: 'ADAUSD', resultKey: 'ADAUSD', color: '#0033AD', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSD', resultKey: 'AVAXUSD', color: '#E84142', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', pair: 'LINKUSD', resultKey: 'LINKUSD', color: '#2A5ADA', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
];

type ChartInterval = '15m' | '1h' | '4h' | '1d' | '1w' | 'ytd' | 'all';

const INTERVALS: { key: ChartInterval; label: string; krakenInterval: number; sinceDelta: number }[] = [
  { key: '15m', label: '15m', krakenInterval: 15, sinceDelta: 24 * 60 * 60 },
  { key: '1h', label: '1H', krakenInterval: 60, sinceDelta: 7 * 24 * 60 * 60 },
  { key: '4h', label: '4H', krakenInterval: 240, sinceDelta: 30 * 24 * 60 * 60 },
  { key: '1d', label: '1D', krakenInterval: 1440, sinceDelta: 365 * 24 * 60 * 60 },
  { key: '1w', label: '1W', krakenInterval: 10080, sinceDelta: 3 * 365 * 24 * 60 * 60 },
  { key: 'ytd', label: 'YTD', krakenInterval: 1440, sinceDelta: (() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - jan1.getTime()) / 1000);
  })() },
  { key: 'all', label: 'ALL', krakenInterval: 10080, sinceDelta: 15 * 365 * 24 * 60 * 60 },
];

type ChartType = 'candle' | 'line';

interface CryptoDashboardProps {
  dark?: boolean;
}

export default function CryptoDashboard({ dark = false }: CryptoDashboardProps) {
  const [selectedCoin, setSelectedCoin] = useState<string>('bitcoin');
  const [interval, setInterval_] = useState<ChartInterval>('1h');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [coinSummaries, setCoinSummaries] = useState<Record<string, CoinSummary>>({});
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [crosshair, setCrosshair] = useState<CrosshairData | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const coinConfig = COINS.find(c => c.id === selectedCoin)!;
  const intervalConfig = INTERVALS.find(i => i.key === interval)!;

  // Fetch OHLC candles for selected coin + interval
  useEffect(() => {
    let cancelled = false;

    async function fetchCandles() {
      setChartLoading(true);
      try {
        const since = Math.floor(Date.now() / 1000) - intervalConfig.sinceDelta;
        const res = await fetch(
          `https://api.kraken.com/0/public/OHLC?pair=${coinConfig.pair}&interval=${intervalConfig.krakenInterval}&since=${since}`,
          { cache: 'no-store' }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.error?.length > 0) return;

        const pairKey = Object.keys(data.result).find(k => k !== 'last');
        if (!pairKey) return;

        const raw = data.result[pairKey] as number[][];
        const parsed: Candle[] = raw.map((c: number[]) => ({
          time: Number(c[0]),
          open: parseFloat(String(c[1])),
          high: parseFloat(String(c[2])),
          low: parseFloat(String(c[3])),
          close: parseFloat(String(c[4])),
          volume: parseFloat(String(c[6])),
        }));

        if (!cancelled) setCandles(parsed);
      } catch (err) {
        console.error('OHLC fetch error:', err);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    fetchCandles();
    return () => { cancelled = true; };
  }, [selectedCoin, interval, coinConfig.pair, intervalConfig.krakenInterval, intervalConfig.sinceDelta]);

  // Fetch ticker summaries for all coins (live polling)
  useEffect(() => {
    async function fetchTickers() {
      try {
        const pairs = COINS.map(c => c.pair).join(',');
        const res = await fetch(
          `https://api.kraken.com/0/public/Ticker?pair=${pairs}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.error?.length > 0) return;

        const summaries: Record<string, CoinSummary> = {};
        for (const coin of COINS) {
          const td = data.result?.[coin.resultKey];
          if (td) {
            const price = parseFloat(td.c?.[0]) || 0;
            const open = parseFloat(td.o) || price;
            const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
            summaries[coin.id] = {
              id: coin.id, symbol: coin.symbol, name: coin.name,
              price, change24h, color: coin.color,
            };
          }
        }
        setCoinSummaries(summaries);
      } catch (err) {
        console.error('Ticker error:', err);
      }
    }

    fetchTickers();
    pollingRef.current = globalThis.setInterval(fetchTickers, 3000);
    return () => {
      if (pollingRef.current) globalThis.clearInterval(pollingRef.current);
    };
  }, []);

  // Fear & Greed
  useEffect(() => {
    async function fetchFG() {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.data?.[0];
        if (item) setFearGreed({ value: parseInt(item.value), classification: item.value_classification });
      } catch {}
    }
    fetchFG();
  }, []);

  const currentSummary = coinSummaries[selectedCoin];
  const currentPrice = currentSummary?.price || (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const currentChange = currentSummary?.change24h || 0;

  // Chart stats
  const stats = useMemo(() => {
    if (candles.length === 0) return null;
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const totalVol = candles.reduce((s, c) => s + c.volume, 0);
    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
      open: candles[0].open,
      volume: totalVol,
    };
  }, [candles]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVol = (v: number): string => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(1);
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts * 1000);
    if (interval === '1d' || interval === '1w' || interval === 'ytd' || interval === 'all') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const bg = dark ? 'bg-[#0f1117]' : 'bg-gray-50';
  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className="space-y-3">
      {/* Coin selector strip */}
      <div className={`${cardBg} border ${border} rounded-xl p-2 overflow-x-auto scrollbar-none`}>
        <div className="flex items-center gap-1.5 min-w-max">
          {COINS.map(coin => {
            const summary = coinSummaries[coin.id];
            const isSelected = coin.id === selectedCoin;
            return (
              <button
                key={coin.id}
                onClick={() => setSelectedCoin(coin.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                  isSelected
                    ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-gray-900 text-white')
                    : (dark ? 'hover:bg-[#1e2130] text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                }`}
              >
                <CoinLogo coin={coin} size={20} />
                <span className="font-semibold">{coin.symbol}</span>
                {summary && (
                  <>
                    <span className={isSelected ? 'text-gray-300' : textSecondary}>
                      {formatPrice(summary.price)}
                    </span>
                    <span className={`text-xs font-medium ${summary.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.change24h >= 0 ? '+' : ''}{summary.change24h.toFixed(2)}%
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chart area */}
      <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
        {/* Chart toolbar */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
          <div className="flex items-center gap-4">
            {/* Coin info */}
            <div className="flex items-center gap-2.5">
              <CoinLogo coin={coinConfig} size={32} />
              <div>
                <div className={`text-sm font-bold ${textPrimary}`}>{coinConfig.name}</div>
                <div className={`text-[11px] ${textMuted}`}>{coinConfig.symbol}/USD</div>
              </div>
            </div>

            {/* Price */}
            <div className="pl-4 border-l border-current/10">
              <div className={`text-xl font-bold tabular-nums ${textPrimary}`}>
                {formatPrice(currentPrice)}
              </div>
              <div className={`text-xs font-semibold ${currentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {currentChange >= 0 ? '+' : ''}{currentChange.toFixed(2)}%
              </div>
            </div>

            {/* OHLCV stats from crosshair or latest */}
            {stats && (
              <div className={`hidden lg:flex items-center gap-4 pl-4 border-l border-current/10 text-[11px] ${textSecondary}`}>
                <div>
                  <span className={textMuted}>O </span>
                  <span className={textPrimary}>{formatPrice(crosshair?.candle.open ?? candles[candles.length - 1]?.open ?? 0)}</span>
                </div>
                <div>
                  <span className={textMuted}>H </span>
                  <span className="text-green-500">{formatPrice(crosshair?.candle.high ?? candles[candles.length - 1]?.high ?? 0)}</span>
                </div>
                <div>
                  <span className={textMuted}>L </span>
                  <span className="text-red-500">{formatPrice(crosshair?.candle.low ?? candles[candles.length - 1]?.low ?? 0)}</span>
                </div>
                <div>
                  <span className={textMuted}>C </span>
                  <span className={textPrimary}>{formatPrice(crosshair?.candle.close ?? candles[candles.length - 1]?.close ?? 0)}</span>
                </div>
                <div>
                  <span className={textMuted}>Vol </span>
                  <span className={textPrimary}>{formatVol(crosshair?.candle.volume ?? candles[candles.length - 1]?.volume ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Chart type toggle */}
            <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${dark ? 'bg-[#12141e]' : 'bg-gray-100'}`}>
              <button
                onClick={() => setChartType('candle')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition ${
                  chartType === 'candle'
                    ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                    : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
                }`}
                title="Candlestick"
              >
                {/* candle icon */}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="2" height="12" rx="0.5" />
                  <rect x="3.75" y="0" width="0.5" height="2" />
                  <rect x="3.75" y="14" width="0.5" height="2" />
                  <rect x="7" y="5" width="2" height="8" rx="0.5" />
                  <rect x="7.75" y="3" width="0.5" height="2" />
                  <rect x="7.75" y="13" width="0.5" height="2" />
                  <rect x="11" y="1" width="2" height="10" rx="0.5" />
                  <rect x="11.75" y="0" width="0.5" height="1" />
                  <rect x="11.75" y="11" width="0.5" height="3" />
                </svg>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition ${
                  chartType === 'line'
                    ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                    : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
                }`}
                title="Line"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="1,12 5,6 9,9 15,2" />
                </svg>
              </button>
            </div>

            {/* Interval selector */}
            <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${dark ? 'bg-[#12141e]' : 'bg-gray-100'}`}>
              {INTERVALS.map(iv => (
                <button
                  key={iv.key}
                  onClick={() => setInterval_(iv.key)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition ${
                    interval === iv.key
                      ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                      : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative" style={{ height: 480 }}>
          {chartLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className={`w-6 h-6 border-2 rounded-full animate-spin ${dark ? 'border-gray-700 border-t-gray-400' : 'border-gray-200 border-t-gray-600'}`} />
            </div>
          ) : (
            <InteractiveChart
              candles={candles}
              dark={dark}
              chartType={chartType}
              coinColor={coinConfig.color}
              onCrosshairChange={setCrosshair}
              formatPrice={formatPrice}
              formatTime={formatTime}
            />
          )}
        </div>
      </div>

      {/* Bottom row: stats + Fear & Greed */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Stats cards */}
        {stats && (
          <>
            <StatCard label="Period High" value={formatPrice(stats.high)} dark={dark} color="text-green-500" />
            <StatCard label="Period Low" value={formatPrice(stats.low)} dark={dark} color="text-red-500" />
            <StatCard label="Period Open" value={formatPrice(stats.open)} dark={dark} />
            <StatCard label="Total Volume" value={formatVol(stats.volume)} dark={dark} />
          </>
        )}
      </div>

      {/* Coin grid with mini charts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COINS.map(coin => {
          const summary = coinSummaries[coin.id];
          if (!summary) return (
            <div key={coin.id} className={`${cardBg} border ${border} rounded-xl p-4 animate-pulse h-20`} />
          );
          const isSelected = coin.id === selectedCoin;

          return (
            <button
              key={coin.id}
              onClick={() => setSelectedCoin(coin.id)}
              className={`rounded-xl p-3 border transition-all text-left ${
                isSelected
                  ? (dark ? 'bg-[#2a2d3a] border-[#3a3d4a] ring-1 ring-blue-500/30' : 'bg-gray-900 text-white border-gray-900')
                  : `${cardBg} ${border} ${dark ? 'hover:border-gray-600' : 'hover:border-gray-400'}`
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CoinLogo coin={coin} size={20} />
                  <span className={`font-semibold text-xs ${isSelected ? 'text-white' : textPrimary}`}>{coin.symbol}</span>
                </div>
                <span className={`text-[10px] font-semibold ${summary.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.change24h >= 0 ? '+' : ''}{summary.change24h.toFixed(2)}%
                </span>
              </div>
              <div className={`text-sm font-bold tabular-nums ${isSelected ? 'text-white' : textPrimary}`}>
                {formatPrice(summary.price)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fear & Greed strip */}
      {fearGreed && (
        <div className={`${cardBg} border ${border} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Fear & Greed Index</div>
            <FearGreedBar value={fearGreed.value} dark={dark} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{
              color: fearGreed.value <= 25 ? '#ef4444' : fearGreed.value <= 45 ? '#f59e0b' :
                fearGreed.value <= 55 ? '#6b7280' : fearGreed.value <= 75 ? '#84cc16' : '#22c55e'
            }}>
              {fearGreed.value}
            </span>
            <span className={`text-xs font-medium ${textSecondary}`}>{fearGreed.classification}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Interactive Chart Component with Zoom & Pan ---
function InteractiveChart({
  candles, dark, chartType, coinColor, onCrosshairChange, formatPrice, formatTime,
}: {
  candles: Candle[];
  dark: boolean;
  chartType: ChartType;
  coinColor: string;
  onCrosshairChange: (data: CrosshairData | null) => void;
  formatPrice: (p: number) => string;
  formatTime: (ts: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Zoom/pan state: visible range of candle indices
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });

  // Reset view when candles change
  useEffect(() => {
    setViewStart(0);
    setViewEnd(candles.length - 1);
  }, [candles.length]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Clamp view range
  const clampView = useCallback((start: number, end: number): [number, number] => {
    const minRange = 10; // minimum visible candles
    let s = Math.max(0, Math.round(start));
    let e = Math.min(candles.length - 1, Math.round(end));
    if (e - s < minRange) {
      const mid = (s + e) / 2;
      s = Math.max(0, Math.round(mid - minRange / 2));
      e = Math.min(candles.length - 1, s + minRange);
      s = Math.max(0, e - minRange);
    }
    return [s, e];
  }, [candles.length]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const range = viewEnd - viewStart;
    const zoomFactor = e.deltaY > 0 ? 0.1 : -0.1; // scroll down = zoom out
    const zoomAmount = range * zoomFactor;

    // Zoom toward mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left - 10; // margin.left
    const chartWidth = dims.w - 80; // margin.left + margin.right
    const mouseRatio = Math.max(0, Math.min(1, mx / chartWidth));

    const newStart = viewStart - zoomAmount * mouseRatio;
    const newEnd = viewEnd + zoomAmount * (1 - mouseRatio);
    const [s, en] = clampView(newStart, newEnd);
    setViewStart(s);
    setViewEnd(en);
  }, [viewStart, viewEnd, dims.w, clampView]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartView.current = { start: viewStart, end: viewEnd };
  }, [viewStart, viewEnd]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDragging.current) {
      const dx = e.clientX - dragStartX.current;
      const chartWidth = dims.w - 80;
      const range = dragStartView.current.end - dragStartView.current.start;
      const candleShift = -(dx / chartWidth) * range;
      const newStart = dragStartView.current.start + candleShift;
      const newEnd = dragStartView.current.end + candleShift;
      const [s, en] = clampView(newStart, newEnd);
      setViewStart(s);
      setViewEnd(en);
    }
  }, [dims.w, clampView]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setMousePos(null);
    onCrosshairChange(null);
  }, [onCrosshairChange]);

  // Reset zoom button
  const handleResetZoom = useCallback(() => {
    setViewStart(0);
    setViewEnd(candles.length - 1);
  }, [candles.length]);

  const isZoomed = viewStart > 0 || viewEnd < candles.length - 1;

  // Visible candles slice
  const visibleCandles = useMemo(() => {
    return candles.slice(viewStart, viewEnd + 1);
  }, [candles, viewStart, viewEnd]);

  const margin = { top: 10, right: 70, bottom: 30, left: 10 };
  const chartW = dims.w - margin.left - margin.right;
  const chartH = dims.h - margin.top - margin.bottom;
  const volH = chartH * 0.15;

  const { priceMin, priceMax, volMax, candleWidth } = useMemo(() => {
    if (visibleCandles.length === 0) return { priceMin: 0, priceMax: 1, volMax: 1, candleWidth: 4 };
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.05;
    const vMax = Math.max(...visibleCandles.map(c => c.volume));
    const cw = Math.max(1, Math.min(12, (chartW / visibleCandles.length) * 0.7));
    return { priceMin: min - pad, priceMax: max + pad, volMax: vMax, candleWidth: cw };
  }, [visibleCandles, chartW]);

  const xScale = useCallback((i: number) => margin.left + (i / Math.max(1, visibleCandles.length - 1)) * chartW, [margin.left, visibleCandles.length, chartW]);
  const yScale = useCallback((price: number) => margin.top + (1 - (price - priceMin) / (priceMax - priceMin)) * (chartH - volH), [margin.top, priceMin, priceMax, chartH, volH]);
  const volScale = useCallback((vol: number) => (vol / volMax) * volH, [volMax, volH]);

  // Find nearest candle to mouse
  const hoveredIdx = useMemo(() => {
    if (!mousePos || visibleCandles.length === 0 || chartW <= 0) return -1;
    const mx = mousePos.x - margin.left;
    const idx = Math.round((mx / chartW) * (visibleCandles.length - 1));
    return Math.max(0, Math.min(visibleCandles.length - 1, idx));
  }, [mousePos, visibleCandles.length, chartW, margin.left]);

  useEffect(() => {
    if (hoveredIdx >= 0 && visibleCandles[hoveredIdx]) {
      onCrosshairChange({
        candle: visibleCandles[hoveredIdx],
        x: xScale(hoveredIdx),
        y: yScale(visibleCandles[hoveredIdx].close),
      });
    } else {
      onCrosshairChange(null);
    }
  }, [hoveredIdx, visibleCandles, xScale, yScale, onCrosshairChange]);

  if (candles.length === 0 || dims.w === 0) {
    return <div ref={containerRef} className="w-full h-full" />;
  }

  const gridColor = dark ? '#1e2030' : '#f0f0f0';
  const textColor = dark ? '#6b7280' : '#9ca3af';

  // Price grid lines (5 lines)
  const priceRange = priceMax - priceMin;
  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const price = priceMin + (priceRange * i) / 5;
    return { price, y: yScale(price) };
  });

  // Time labels
  const timeStep = Math.max(1, Math.floor(visibleCandles.length / 6));
  const timeLabels = visibleCandles
    .map((c, i) => ({ time: c.time, idx: i }))
    .filter((_, i) => i % timeStep === 0 || i === visibleCandles.length - 1)
    .map(t => ({ time: t.time, x: xScale(t.idx) }));

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${isDragging.current ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* Reset zoom button */}
      {isZoomed && (
        <button
          onClick={handleResetZoom}
          className={`absolute top-2 right-20 z-10 px-2 py-1 text-[10px] font-medium rounded-md transition ${
            dark ? 'bg-[#2a2d3a] text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          Reset Zoom
        </button>
      )}

      <svg width={dims.w} height={dims.h} className="select-none">
        {/* Grid */}
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line x1={margin.left} y1={gl.y} x2={dims.w - margin.right} y2={gl.y}
              stroke={gridColor} strokeWidth={1} />
            <text x={dims.w - margin.right + 8} y={gl.y + 4}
              fill={textColor} fontSize="10" fontFamily="monospace">
              {formatPrice(gl.price)}
            </text>
          </g>
        ))}

        {/* Volume bars */}
        {visibleCandles.map((c, i) => {
          const x = xScale(i);
          const barH = volScale(c.volume);
          const barBottom = dims.h - margin.bottom;
          return (
            <rect
              key={`vol-${i}`}
              x={x - candleWidth / 2}
              y={barBottom - barH}
              width={candleWidth}
              height={barH}
              fill={c.close >= c.open ? (dark ? '#22c55e20' : '#22c55e30') : (dark ? '#ef444420' : '#ef444430')}
            />
          );
        })}

        {/* Chart content */}
        {chartType === 'candle' ? (
          visibleCandles.map((c, i) => {
            const x = xScale(i);
            const openY = yScale(c.open);
            const closeY = yScale(c.close);
            const highY = yScale(c.high);
            const lowY = yScale(c.low);
            const bull = c.close >= c.open;
            const color = bull ? '#22c55e' : '#ef4444';
            const bodyTop = Math.min(openY, closeY);
            const bodyH = Math.max(1, Math.abs(openY - closeY));

            return (
              <g key={i}>
                <line x1={x} y1={highY} x2={x} y2={lowY}
                  stroke={color} strokeWidth={1} />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyH}
                  fill={color}
                  stroke={color}
                  strokeWidth={0.5}
                />
              </g>
            );
          })
        ) : (
          <>
            <defs>
              <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={coinColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={coinColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(c.close)}`).join(' ')
                + ` L ${xScale(visibleCandles.length - 1)} ${dims.h - margin.bottom - volH}`
                + ` L ${xScale(0)} ${dims.h - margin.bottom - volH} Z`}
              fill="url(#lineGrad)"
            />
            <path
              d={visibleCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(c.close)}`).join(' ')}
              fill="none"
              stroke={coinColor}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Time axis */}
        {timeLabels.map((tl, i) => (
          <text key={i} x={tl.x} y={dims.h - 8}
            fill={textColor} fontSize="9" textAnchor="middle" fontFamily="monospace">
            {formatTime(tl.time)}
          </text>
        ))}

        {/* Crosshair */}
        {hoveredIdx >= 0 && mousePos && !isDragging.current && (
          <>
            <line
              x1={xScale(hoveredIdx)} y1={margin.top}
              x2={xScale(hoveredIdx)} y2={dims.h - margin.bottom}
              stroke={dark ? '#444' : '#bbb'} strokeWidth={1} strokeDasharray="3,3"
            />
            <line
              x1={margin.left} y1={mousePos.y}
              x2={dims.w - margin.right} y2={mousePos.y}
              stroke={dark ? '#444' : '#bbb'} strokeWidth={1} strokeDasharray="3,3"
            />
            <rect
              x={dims.w - margin.right}
              y={mousePos.y - 10}
              width={margin.right}
              height={20}
              fill={dark ? '#2a2d3a' : '#374151'}
              rx={3}
            />
            <text
              x={dims.w - margin.right + 8}
              y={mousePos.y + 4}
              fill="white" fontSize="10" fontFamily="monospace"
            >
              {formatPrice(priceMin + (1 - (mousePos.y - margin.top) / (chartH - volH)) * priceRange)}
            </text>
            {visibleCandles[hoveredIdx] && (
              <>
                <rect
                  x={xScale(hoveredIdx) - 40}
                  y={dims.h - margin.bottom}
                  width={80}
                  height={18}
                  fill={dark ? '#2a2d3a' : '#374151'}
                  rx={3}
                />
                <text
                  x={xScale(hoveredIdx)}
                  y={dims.h - margin.bottom + 13}
                  fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace"
                >
                  {formatTime(visibleCandles[hoveredIdx].time)}
                </text>
              </>
            )}
            <circle
              cx={xScale(hoveredIdx)}
              cy={yScale(visibleCandles[hoveredIdx].close)}
              r={4}
              fill={coinColor}
              stroke={dark ? '#0f1117' : 'white'}
              strokeWidth={2}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// --- Sub-components ---
function CoinLogo({ coin, size = 20 }: { coin: { logo: string; color: string; symbol: string }; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: coin.color, fontSize: size * 0.4 }}
      >
        {coin.symbol.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={coin.logo}
      alt={coin.symbol}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}

function StatCard({ label, value, dark, color }: { label: string; value: string; dark: boolean; color?: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${dark ? 'bg-[#181b25] border-[#2a2d3a]' : 'bg-white border-gray-200'}`}>
      <div className={`text-[11px] uppercase tracking-wider mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color || (dark ? 'text-gray-100' : 'text-gray-900')}`}>{value}</div>
    </div>
  );
}

function FearGreedBar({ value, dark }: { value: number; dark: boolean }) {
  return (
    <div className={`w-32 h-2 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, #ef4444, #f59e0b, #84cc16, #22c55e)`,
        }}
      />
    </div>
  );
}
