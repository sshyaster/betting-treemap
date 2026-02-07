'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: 'crypto' | 'economy' | 'politics';
}

type NewsCategory = 'all' | 'crypto' | 'economy' | 'politics' | 'saved';

interface NewsFeedProps {
  dark?: boolean;
}

const CATEGORIES: { key: NewsCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📰' },
  { key: 'crypto', label: 'Crypto', icon: '₿' },
  { key: 'economy', label: 'Economy', icon: '📈' },
  { key: 'politics', label: 'Politics', icon: '🏛' },
  { key: 'saved', label: 'Saved', icon: '★' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  crypto: { bg: 'bg-orange-50', text: 'text-orange-600', darkBg: 'bg-orange-500/10', darkText: 'text-orange-400' },
  economy: { bg: 'bg-green-50', text: 'text-green-600', darkBg: 'bg-green-500/10', darkText: 'text-green-400' },
  politics: { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'bg-blue-500/10', darkText: 'text-blue-400' },
};

export default function NewsFeed({ dark = false }: NewsFeedProps) {
  const { data: session } = useSession();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<NewsCategory>('all');
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  // Fetch saved articles list
  const fetchSaved = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/saved-articles');
      if (res.ok) {
        const data = await res.json();
        setSavedUrls(new Set((data.saved || []).map((s: { url: string }) => s.url)));
      }
    } catch {
      // silently fail
    }
  }, [session]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      if (category === 'saved') {
        const res = await fetch('/api/saved-articles');
        if (res.ok) {
          const data = await res.json();
          const items: NewsItem[] = (data.saved || []).map((s: { url: string; title: string; source: string; category: string; savedAt: string }, i: number) => ({
            id: `saved-${i}`,
            title: s.title,
            url: s.url,
            source: s.source,
            publishedAt: s.savedAt,
            category: s.category as NewsItem['category'],
          }));
          setNews(items);
        }
      } else {
        const res = await fetch(`/api/news?category=${category}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data.news || []);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh every 5 minutes (not for saved tab)
  useEffect(() => {
    if (category === 'saved') return;
    const interval = globalThis.setInterval(fetchNews, 5 * 60 * 1000);
    return () => globalThis.clearInterval(interval);
  }, [fetchNews, category]);

  const toggleSave = async (item: NewsItem) => {
    if (!session?.user) return;
    setSavingUrl(item.url);
    try {
      if (savedUrls.has(item.url)) {
        await fetch(`/api/saved-articles?url=${encodeURIComponent(item.url)}`, { method: 'DELETE' });
        setSavedUrls(prev => { const next = new Set(prev); next.delete(item.url); return next; });
        // Remove from list if on saved tab
        if (category === 'saved') {
          setNews(prev => prev.filter(n => n.url !== item.url));
        }
      } else {
        await fetch('/api/saved-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, url: item.url, source: item.source, category: item.category }),
        });
        setSavedUrls(prev => new Set(prev).add(item.url));
      }
    } catch {
      // silently fail
    } finally {
      setSavingUrl(null);
    }
  };

  const timeAgo = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`${cardBg} border ${border} rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>News Feed</h2>
            <p className={`text-xs ${textMuted}`}>Crypto, economy & politics — auto-refreshes every 5 min</p>
          </div>
          <button
            onClick={fetchNews}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              dark
                ? 'bg-[#2a2d3a] text-gray-300 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Category filter */}
        <div className={`flex items-center gap-1 rounded-lg p-0.5 ${dark ? 'bg-[#12141e]' : 'bg-gray-100'}`}>
          {CATEGORIES.map(cat => {
            // Only show Saved tab if logged in
            if (cat.key === 'saved' && !session?.user) return null;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  category === cat.key
                    ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                    : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* News list */}
      {loading && news.length === 0 ? (
        <div className={`${cardBg} border ${border} rounded-xl p-8`}>
          <div className="flex flex-col items-center gap-3">
            <div className={`w-6 h-6 border-2 rounded-full animate-spin ${dark ? 'border-gray-700 border-t-gray-400' : 'border-gray-200 border-t-gray-600'}`} />
            <span className={`text-sm ${textMuted}`}>Loading news...</span>
          </div>
        </div>
      ) : news.length === 0 ? (
        <div className={`${cardBg} border ${border} rounded-xl p-8 text-center`}>
          <span className={`text-sm ${textMuted}`}>
            {category === 'saved' ? 'No saved articles yet. Click the bookmark icon on any article to save it.' : 'No news found. Try a different category.'}
          </span>
        </div>
      ) : (
        <div className={`${cardBg} border ${border} rounded-xl overflow-hidden divide-y ${dark ? 'divide-[#2a2d3a]' : 'divide-gray-100'}`}>
          {news.map((item) => {
            const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.crypto;
            const isSaved = savedUrls.has(item.url);
            return (
              <div
                key={item.id}
                className={`px-4 py-3.5 transition group ${dark ? 'hover:bg-[#1e2130]' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Category badge */}
                  <span className={`mt-0.5 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    dark ? catColor.darkBg + ' ' + catColor.darkText : catColor.bg + ' ' + catColor.text
                  }`}>
                    {item.category}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm font-medium leading-snug hover:text-blue-400 transition ${textPrimary}`}
                    >
                      {item.title}
                    </a>

                    {/* Meta */}
                    <div className={`flex items-center gap-2 mt-1.5 text-[11px] ${textSecondary}`}>
                      <span className="font-medium">{item.source}</span>
                      <span className={textMuted}>·</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Save button */}
                  {session?.user && (
                    <button
                      onClick={() => toggleSave(item)}
                      disabled={savingUrl === item.url}
                      className={`flex-shrink-0 mt-0.5 p-1 rounded transition ${
                        isSaved
                          ? 'text-yellow-500 hover:text-yellow-400'
                          : `${textMuted} hover:text-yellow-500`
                      } ${savingUrl === item.url ? 'opacity-50' : ''}`}
                      title={isSaved ? 'Unsave article' : 'Save article'}
                    >
                      <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 3v18l7-5 7 5V3H5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}

                  {/* External link icon */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition ${textMuted}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className={`text-center text-[10px] ${textMuted} py-1`}>
        Crypto news via CoinGecko · Economy & politics via Google News · Articles archived daily
      </div>
    </div>
  );
}
