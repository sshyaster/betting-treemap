'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

interface FeedAccount {
  handle: string;
  label: string;
  description: string;
  category: Category;
  color: string;
  tags?: string[];
}

type Category = 'politics' | 'crypto' | 'solana' | 'memecoins' | 'markets' | 'media';

const CATEGORIES: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'politics', label: 'Politics' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'solana', label: 'Solana' },
  { key: 'memecoins', label: 'Memecoins' },
  { key: 'markets', label: 'Markets' },
  { key: 'media', label: 'Media' },
];

const ACCOUNTS: FeedAccount[] = [
  // Politics
  { handle: 'realDonaldTrump', label: 'Donald Trump', description: 'President. Single tweets move BTC, memecoins, and prediction markets.', category: 'politics', color: '#e74c3c', tags: ['TRUMP', 'policy'] },
  { handle: 'WhiteHouse', label: 'White House', description: 'Executive orders, policy announcements.', category: 'politics', color: '#1d4ed8', tags: ['policy'] },
  { handle: 'POTUS', label: 'POTUS', description: 'Official Presidential account.', category: 'politics', color: '#1e3a5f', tags: ['policy'] },
  { handle: 'elonmusk', label: 'Elon Musk', description: 'CEO of Tesla, SpaceX, xAI. Moves DOGE and memecoins.', category: 'politics', color: '#1DA1F2', tags: ['DOGE', 'memecoins'] },
  { handle: 'RobertKennedyJr', label: 'RFK Jr.', description: 'HHS Secretary. Moves biotech prediction markets.', category: 'politics', color: '#6b7280', tags: ['health'] },
  { handle: 'VivekGRamaswamy', label: 'Vivek Ramaswamy', description: 'Crypto-friendly policy commentary.', category: 'politics', color: '#f59e0b', tags: ['regulation'] },

  // Crypto
  { handle: 'brian_armstrong', label: 'Brian Armstrong', description: 'CEO of Coinbase. Listings, regulatory battles.', category: 'crypto', color: '#0052FF', tags: ['Coinbase'] },
  { handle: 'cz_binance', label: 'CZ', description: 'Binance founder. Listings, market commentary.', category: 'crypto', color: '#F0B90B', tags: ['Binance'] },
  { handle: 'VitalikButerin', label: 'Vitalik Buterin', description: 'Ethereum co-founder. ETH roadmap, L2s.', category: 'crypto', color: '#627EEA', tags: ['ETH'] },
  { handle: 'saylor', label: 'Michael Saylor', description: 'MicroStrategy. BTC accumulation moves markets.', category: 'crypto', color: '#F7931A', tags: ['BTC'] },
  { handle: 'APompliano', label: 'Pompliano', description: 'Crypto investor. Market calls, macro takes.', category: 'crypto', color: '#F7931A', tags: ['BTC', 'macro'] },
  { handle: 'AltcoinGordon', label: 'Altcoin Gordon', description: 'Altcoin trader. Alt calls, memecoin alpha.', category: 'crypto', color: '#8b5cf6', tags: ['altcoins'] },

  // Solana
  { handle: 'aeyakovenko', label: 'Toly', description: 'Solana co-founder. Roadmap, Firedancer updates.', category: 'solana', color: '#9945FF', tags: ['SOL'] },
  { handle: 'rajgokal', label: 'Raj Gokal', description: 'Solana co-founder. Ecosystem growth, DeFi.', category: 'solana', color: '#14F195', tags: ['SOL'] },
  { handle: '0xMert_', label: 'Mert', description: 'Helius CEO. Solana infra, RPC, alpha.', category: 'solana', color: '#E8590C', tags: ['Helius'] },
  { handle: 'weremeow', label: 'meow', description: 'Jupiter co-founder. Largest Solana DEX. JUP.', category: 'solana', color: '#00BFA5', tags: ['Jupiter', 'JUP'] },
  { handle: 'armaniferrante', label: 'Armani Ferrante', description: 'Backpack / Mad Lads founder.', category: 'solana', color: '#FF6B6B', tags: ['Backpack'] },
  { handle: 'DriftProtocol', label: 'Drift Protocol', description: 'Solana perpetuals DEX.', category: 'solana', color: '#8b5cf6', tags: ['perps', 'DeFi'] },

  // Memecoins
  { handle: 'MustStopMurad', label: 'Murad', description: 'Memecoin supercycle thesis. Community tokens.', category: 'memecoins', color: '#22c55e', tags: ['supercycle'] },
  { handle: 'blknoiz06', label: 'Blknoiz06', description: 'Degen trader. Memecoin early calls.', category: 'memecoins', color: '#a855f7', tags: ['degen'] },
  { handle: 'CryptoGodJohn', label: 'GodJohn', description: 'CT influencer. Memecoin calls.', category: 'memecoins', color: '#eab308', tags: ['calls'] },
  { handle: 'pumpdotfun', label: 'pump.fun', description: 'Solana memecoin launchpad.', category: 'memecoins', color: '#06b6d4', tags: ['launchpad'] },
  { handle: 'cb_doge', label: 'CB Doge', description: 'DOGE community and sentiment.', category: 'memecoins', color: '#C2A633', tags: ['DOGE'] },
  { handle: 'solanafloor', label: 'Solana Floor', description: 'SOL NFT and memecoin tracker.', category: 'memecoins', color: '#9945FF', tags: ['SOL', 'NFT'] },

  // Markets
  { handle: 'unusual_whales', label: 'Unusual Whales', description: 'Options flow, congressional trades.', category: 'markets', color: '#3b82f6', tags: ['options'] },
  { handle: 'DeItaone', label: 'Walter Bloomberg', description: 'Breaking financial news. Fastest headlines.', category: 'markets', color: '#ef4444', tags: ['breaking'] },
  { handle: 'KobeissiLetter', label: 'Kobeissi Letter', description: 'Macro analysis, market trends.', category: 'markets', color: '#10b981', tags: ['macro'] },
  { handle: 'WhaleWire', label: 'Whale Wire', description: 'Whale movements, exchange flows.', category: 'markets', color: '#6366f1', tags: ['whales'] },
  { handle: 'lookonchain', label: 'Lookonchain', description: 'On-chain analytics. Smart money.', category: 'markets', color: '#14b8a6', tags: ['on-chain'] },

  // Media
  { handle: 'CoinDesk', label: 'CoinDesk', description: 'Leading crypto news outlet.', category: 'media', color: '#1d4ed8', tags: ['news'] },
  { handle: 'Cointelegraph', label: 'Cointelegraph', description: 'Crypto news and analysis.', category: 'media', color: '#27AE60', tags: ['news'] },
  { handle: 'TheBlock__', label: 'The Block', description: 'Crypto research, data-driven.', category: 'media', color: '#374151', tags: ['research'] },
  { handle: 'WuBlockchain', label: 'Wu Blockchain', description: 'Asian crypto market news.', category: 'media', color: '#ef4444', tags: ['Asia'] },
];

const UNIQUE_ACCOUNTS = ACCOUNTS.filter((acc, i, arr) =>
  arr.findIndex(a => a.handle === acc.handle) === i
);

interface TwitterFeedProps {
  dark?: boolean;
}

function ProfileImg({ handle, size = 40, color }: { handle: string; size?: number; color: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.3 }}
      >
        @
      </div>
    );
  }

  return (
    <img
      src={`https://unavatar.io/twitter/${handle}`}
      alt={handle}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}

export default function TwitterFeed({ dark = false }: TwitterFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedAccount, setSelectedAccount] = useState<FeedAccount>(UNIQUE_ACCOUNTS[0]);
  const [search, setSearch] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filtered = useMemo(() => {
    let list = UNIQUE_ACCOUNTS;
    if (selectedCategory !== 'all') {
      list = list.filter(a => a.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.label.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCategory, search]);

  // When selecting account, bump iframe key to force reload
  const handleSelectAccount = (acc: FeedAccount) => {
    setSelectedAccount(acc);
    setIframeKey(k => k + 1);
  };

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

  const timelineUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${selectedAccount.handle}?dnt=true&embedId=twitter-timeline-${selectedAccount.handle}&lang=en&theme=${dark ? 'dark' : 'light'}&showReplies=false`;

  return (
    <div className="space-y-3">
      {/* Header with category tabs */}
      <div className={`${cardBg} border ${border} rounded-xl px-4 py-3`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={textPrimary}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className={`text-sm font-semibold ${textPrimary}`}>Feed</span>
            <span className={`text-xs ${textSecondary}`}>Market-moving accounts</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className={`border rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none ${
                dark
                  ? 'bg-[#12141e] border-[#2a2d3a] text-white placeholder-gray-500 focus:border-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${dark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat.key
                  ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-gray-900 text-white')
                  : (dark ? 'text-gray-400 hover:text-white hover:bg-[#1e2130]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: sidebar + timeline */}
      <div className="flex gap-3" style={{ height: 'calc(100vh - 220px)', minHeight: 600 }}>
        {/* Left sidebar — account list */}
        <div className={`${cardBg} border ${border} rounded-xl overflow-hidden flex flex-col`} style={{ width: 320, minWidth: 280 }}>
          <div className={`px-3 py-2 border-b ${border} flex-shrink-0`}>
            <span className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>
              {filtered.length} Accounts
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(acc => {
              const isActive = acc.handle === selectedAccount.handle;
              return (
                <button
                  key={acc.handle}
                  onClick={() => handleSelectAccount(acc)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b ${
                    isActive
                      ? (dark ? 'bg-[#2a2d3a] border-[#2a2d3a]' : 'bg-blue-50 border-gray-100')
                      : (dark ? 'hover:bg-[#1e2130] border-[#2a2d3a]/50' : 'hover:bg-gray-50 border-gray-100')
                  }`}
                >
                  <ProfileImg handle={acc.handle} size={36} color={acc.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? (dark ? 'text-white' : 'text-gray-900') : textPrimary}`}>
                        {acc.label}
                      </span>
                    </div>
                    <div className={`text-[11px] truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      @{acc.handle}
                    </div>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                    dark ? 'bg-[#12141e] text-gray-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {CATEGORIES.find(c => c.key === acc.category)?.label}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className={`text-center py-12 ${textMuted} text-sm`}>No accounts match</div>
            )}
          </div>
        </div>

        {/* Right panel — timeline */}
        <div className={`${cardBg} border ${border} rounded-xl overflow-hidden flex flex-col flex-1`}>
          {/* Selected account header */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${border} flex-shrink-0`}>
            <ProfileImg handle={selectedAccount.handle} size={44} color={selectedAccount.color} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold ${textPrimary}`}>{selectedAccount.label}</div>
              <div className={`text-xs ${textMuted}`}>@{selectedAccount.handle} &middot; {selectedAccount.description}</div>
            </div>
            <a
              href={`https://x.com/${selectedAccount.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition flex-shrink-0 ${
                dark
                  ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                  : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-500'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Open on X
            </a>
          </div>

          {/* Embedded timeline */}
          <div className="flex-1 relative">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={timelineUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              title={`@${selectedAccount.handle} timeline`}
              loading="lazy"
            />
            {/* Fallback overlay if iframe doesn't load */}
            <IframeFallback
              handle={selectedAccount.handle}
              dark={dark}
              color={selectedAccount.color}
              label={selectedAccount.label}
              iframeKey={iframeKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Shows fallback content after a delay if the iframe is likely blocked
function IframeFallback({
  handle, dark, color, label, iframeKey,
}: {
  handle: string;
  dark: boolean;
  color: string;
  label: string;
  iframeKey: number;
}) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setShowFallback(false);
    const timer = setTimeout(() => setShowFallback(true), 6000);
    return () => clearTimeout(timer);
  }, [iframeKey]);

  if (!showFallback) return null;

  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none ${dark ? 'bg-[#181b25]/90' : 'bg-white/90'}`}>
      <ProfileImg handle={handle} size={64} color={color} />
      <div className="text-center">
        <div className={`text-base font-semibold ${textPrimary}`}>{label}</div>
        <div className={`text-sm ${textSecondary} mt-1`}>@{handle}</div>
      </div>
      <p className={`text-xs ${textSecondary} text-center max-w-xs`}>
        X/Twitter may block embedded timelines. View this account directly on X to see their latest posts.
      </p>
      <a
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition ${
          dark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        View @{handle} on X
      </a>
    </div>
  );
}
