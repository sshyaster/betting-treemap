'use client';

import { useMemo } from 'react';
import { Market, Timeframe } from '@/lib/types';
import { formatVolume, getVolumeForTimeframe } from '@/lib/utils';

interface InsightsProps {
  polyMarkets: Market[];
  kalshiMarkets: Market[];
  timeframe: Timeframe;
  dark?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Politics': '#6aaa6d',
  'Sports': '#5ba3d9',
  'Crypto': '#d96b8a',
  'Economics': '#8db552',
  'Tech': '#9b6dc6',
  'Entertainment': '#d9a04e',
  'World': '#4db8a8',
  'Other': '#9484b8',
};

export default function Insights({ polyMarkets, kalshiMarkets, timeframe, dark = false }: InsightsProps) {
  // Top markets by volume
  const topPoly = useMemo(() => {
    return [...polyMarkets]
      .sort((a, b) => getVolumeForTimeframe(b, timeframe) - getVolumeForTimeframe(a, timeframe))
      .slice(0, 10);
  }, [polyMarkets, timeframe]);

  const topKalshi = useMemo(() => {
    return [...kalshiMarkets]
      .sort((a, b) => getVolumeForTimeframe(b, timeframe) - getVolumeForTimeframe(a, timeframe))
      .slice(0, 10);
  }, [kalshiMarkets, timeframe]);

  // Category breakdown for Polymarket
  const polyCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of polyMarkets) {
      const vol = getVolumeForTimeframe(m, timeframe);
      map.set(m.category, (map.get(m.category) || 0) + vol);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, volume]) => ({ name, volume }));
  }, [polyMarkets, timeframe]);

  const kalshiCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of kalshiMarkets) {
      const vol = getVolumeForTimeframe(m, timeframe);
      map.set(m.category, (map.get(m.category) || 0) + vol);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, volume]) => ({ name, volume }));
  }, [kalshiMarkets, timeframe]);

  const polyTotal = polyCategories.reduce((s, c) => s + c.volume, 0);
  const kalshiTotal = kalshiCategories.reduce((s, c) => s + c.volume, 0);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Polymarket Markets" value={polyMarkets.length.toString()} sub="Active events" dark={dark} />
        <StatCard label="Polymarket Volume" value={formatVolume(polyTotal)} sub={`${timeframe} total`} accent dark={dark} />
        <StatCard label="Kalshi Markets" value={kalshiMarkets.length.toString()} sub="Active events" dark={dark} />
        <StatCard label="Kalshi Volume" value={formatVolume(kalshiTotal)} sub={`${timeframe} total`} accent dark={dark} />
      </div>

      {/* Category breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-5 ${dark ? 'bg-[#1a1d27] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Polymarket Category Breakdown
          </h3>
          <DonutChart categories={polyCategories} total={polyTotal} dark={dark} />
          <div className="mt-4 space-y-2">
            {polyCategories.map(cat => (
              <CategoryBar key={cat.name} name={cat.name} volume={cat.volume} total={polyTotal} dark={dark} />
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${dark ? 'bg-[#1a1d27] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Kalshi Category Breakdown
          </h3>
          <DonutChart categories={kalshiCategories} total={kalshiTotal} dark={dark} />
          <div className="mt-4 space-y-2">
            {kalshiCategories.map(cat => (
              <CategoryBar key={cat.name} name={cat.name} volume={cat.volume} total={kalshiTotal} dark={dark} />
            ))}
          </div>
        </div>
      </div>

      {/* Hot Markets side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-5 ${dark ? 'bg-[#1a1d27] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Top Polymarket Events
          </h3>
          <div className="space-y-3">
            {topPoly.map((market, i) => (
              <HotMarketRow key={market.id} rank={i + 1} market={market} timeframe={timeframe}
                maxVol={getVolumeForTimeframe(topPoly[0], timeframe)} dark={dark} />
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${dark ? 'bg-[#1a1d27] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Top Kalshi Events
          </h3>
          <div className="space-y-3">
            {topKalshi.length > 0 ? topKalshi.map((market, i) => (
              <HotMarketRow key={market.id} rank={i + 1} market={market} timeframe={timeframe}
                maxVol={getVolumeForTimeframe(topKalshi[0], timeframe)} dark={dark} />
            )) : (
              <div className="text-gray-400 text-sm py-8 text-center">Loading Kalshi data...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, dark }: { label: string; value: string; sub: string; accent?: boolean; dark?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${
      accent
        ? 'bg-gray-900 text-white border-gray-900'
        : dark ? 'bg-[#1a1d27] border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`text-xs uppercase tracking-wider mb-2 ${accent ? 'text-gray-400' : dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-white' : dark ? 'text-gray-100' : 'text-gray-900'}`}>{value}</div>
      <div className={`text-xs mt-1 ${accent ? 'text-gray-400' : dark ? 'text-gray-500' : 'text-gray-500'}`}>{sub}</div>
    </div>
  );
}

function DonutChart({ categories, total, dark }: { categories: { name: string; volume: number }[]; total: number; dark?: boolean }) {
  if (total === 0) return null;

  const size = 140;
  const center = size / 2;
  const radius = 55;
  const innerRadius = 38;

  let cumAngle = -Math.PI / 2;
  const paths = categories.map(cat => {
    const angle = (cat.volume / total) * Math.PI * 2;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = center + Math.cos(startAngle) * radius;
    const y1 = center + Math.sin(startAngle) * radius;
    const x2 = center + Math.cos(endAngle) * radius;
    const y2 = center + Math.sin(endAngle) * radius;
    const ix1 = center + Math.cos(endAngle) * innerRadius;
    const iy1 = center + Math.sin(endAngle) * innerRadius;
    const ix2 = center + Math.cos(startAngle) * innerRadius;
    const iy2 = center + Math.sin(startAngle) * innerRadius;

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    return { d, color: CATEGORY_COLORS[cat.name] || '#9ca3af', name: cat.name };
  });

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke={dark ? '#1a1d27' : 'white'} strokeWidth="1.5" />
        ))}
        <text x={center} y={center - 4} textAnchor="middle" fill={dark ? '#e5e7eb' : '#111'} fontSize="14" fontWeight="700">
          {formatVolume(total)}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fill="#6b7280" fontSize="10">
          Total
        </text>
      </svg>
    </div>
  );
}

function CategoryBar({ name, volume, total, dark }: { name: string; volume: number; total: number; dark?: boolean }) {
  const pct = total > 0 ? (volume / total) * 100 : 0;
  const color = CATEGORY_COLORS[name] || '#9ca3af';

  return (
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs font-medium truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{name}</span>
          <span className={`text-xs ml-2 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{formatVolume(volume)}</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function HotMarketRow({ rank, market, timeframe, maxVol, dark }: { rank: number; market: Market; timeframe: Timeframe; maxVol: number; dark?: boolean }) {
  const vol = getVolumeForTimeframe(market, timeframe);
  const barPct = maxVol > 0 ? (vol / maxVol) * 100 : 0;
  const color = CATEGORY_COLORS[market.category] || '#9ca3af';

  return (
    <a
      href={market.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="flex items-start gap-3">
        <span className={`text-xs font-bold w-5 pt-0.5 text-right ${dark ? 'text-gray-600' : 'text-gray-300'}`}>{rank}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium group-hover:text-blue-400 transition truncate ${dark ? 'text-gray-200' : 'text-gray-900'}`}>
            {market.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color }} />
            </div>
            <span className={`text-xs font-semibold ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{formatVolume(vol)}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 inline-block">{market.category}</span>
        </div>
      </div>
    </a>
  );
}
