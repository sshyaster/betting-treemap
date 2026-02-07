'use client';

import { useState, useMemo, useCallback } from 'react';
import { Market, Timeframe } from '@/lib/types';
import { formatVolume, getVolumeForTimeframe } from '@/lib/utils';

interface DataTableProps {
  polyMarkets: Market[];
  kalshiMarkets: Market[];
  timeframe: Timeframe;
}

type SortKey = 'title' | 'platform' | 'category' | 'volume' | 'openInterest';
type SortDir = 'asc' | 'desc';
type PlatformFilter = 'all' | 'polymarket' | 'kalshi';

export default function DataTable({ polyMarkets, kalshiMarkets, timeframe }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const allMarkets = useMemo(() => {
    return [...polyMarkets, ...kalshiMarkets];
  }, [polyMarkets, kalshiMarkets]);

  const filtered = useMemo(() => {
    let list = allMarkets;

    if (platformFilter !== 'all') {
      list = list.filter(m => m.platform === platformFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'platform': aVal = a.platform; bVal = b.platform; break;
        case 'category': aVal = a.category; bVal = b.category; break;
        case 'volume': aVal = getVolumeForTimeframe(a, timeframe); bVal = getVolumeForTimeframe(b, timeframe); break;
        case 'openInterest': aVal = a.openInterest; bVal = b.openInterest; break;
        default: aVal = 0; bVal = 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return list;
  }, [allMarkets, platformFilter, search, sortKey, sortDir, timeframe]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const downloadCSV = useCallback(() => {
    const headers = ['Title', 'Platform', 'Category', 'Volume (24h)', 'Volume (All)', 'Open Interest', 'URL'];
    const rows = filtered.map(m => [
      `"${m.title.replace(/"/g, '""')}"`,
      m.platform,
      m.category,
      m.volume24hr,
      m.volumeAll,
      m.openInterest,
      m.url,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-markets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-white ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Platform filter */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
            {(['all', 'polymarket', 'kalshi'] as PlatformFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  platformFilter === p
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'All' : p === 'polymarket' ? 'Polymarket' : 'Kalshi'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 w-64 focus:outline-none focus:border-gray-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{filtered.length} markets</span>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white hover:border-gray-500 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none" onClick={() => handleSort('platform')}>
                  Source<SortIcon col="platform" />
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none" onClick={() => handleSort('category')}>
                  Category<SortIcon col="category" />
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none min-w-[300px]" onClick={() => handleSort('title')}>
                  Market<SortIcon col="title" />
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none" onClick={() => handleSort('volume')}>
                  Volume<SortIcon col="volume" />
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none" onClick={() => handleSort('openInterest')}>
                  Open Interest<SortIcon col="openInterest" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((market) => (
                <tr
                  key={market.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/50 transition cursor-pointer"
                  onClick={() => window.open(market.url, '_blank')}
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                      market.platform === 'polymarket'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        market.platform === 'polymarket' ? 'bg-blue-400' : 'bg-emerald-400'
                      }`} />
                      {market.platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{market.category}</td>
                  <td className="px-4 py-3 text-white font-medium">{market.title}</td>
                  <td className="px-4 py-3 text-right text-gray-200 font-mono text-xs">
                    {formatVolume(getVolumeForTimeframe(market, timeframe))}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200 font-mono text-xs">
                    {formatVolume(market.openInterest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 100 && (
          <div className="px-4 py-3 text-center text-gray-500 text-xs border-t border-gray-800">
            Showing 100 of {filtered.length} markets. Use search to filter.
          </div>
        )}

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500 text-sm">
            No markets found.
          </div>
        )}
      </div>
    </div>
  );
}
