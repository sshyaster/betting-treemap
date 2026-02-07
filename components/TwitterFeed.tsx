'use client';

import { useState, useMemo } from 'react';

interface FeedAccount {
  handle: string;
  label: string;
  description: string;
  category: Category;
  color: string;
  tags?: string[];
}

type Category = 'politics' | 'crypto' | 'solana' | 'memecoins' | 'markets' | 'media';

const CATEGORIES: { key: Category | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'politics', label: 'Politics', emoji: '🏛' },
  { key: 'crypto', label: 'Crypto', emoji: '₿' },
  { key: 'solana', label: 'Solana', emoji: '◎' },
  { key: 'memecoins', label: 'Memecoins', emoji: '🐸' },
  { key: 'markets', label: 'Markets', emoji: '📈' },
  { key: 'media', label: 'Media', emoji: '📰' },
];

const ACCOUNTS: FeedAccount[] = [
  // Politics — moves prediction markets + crypto
  { handle: 'realDonaldTrump', label: 'Donald Trump', description: 'President of the United States. Single tweets have moved BTC, memecoins, and prediction markets.', category: 'politics', color: '#e74c3c', tags: ['TRUMP', 'policy'] },
  { handle: 'WhiteHouse', label: 'White House', description: 'Official White House account. Executive orders, policy announcements.', category: 'politics', color: '#1d4ed8', tags: ['policy', 'regulation'] },
  { handle: 'POTUS', label: 'POTUS', description: 'Official Presidential account. Policy and economic statements.', category: 'politics', color: '#1e3a5f', tags: ['policy'] },
  { handle: 'elonmusk', label: 'Elon Musk', description: 'CEO of Tesla, SpaceX, xAI. Moves DOGE, memecoins, and market sentiment with single posts.', category: 'politics', color: '#1DA1F2', tags: ['DOGE', 'memecoins', 'DOGE'] },
  { handle: 'RobertKennedyJr', label: 'RFK Jr.', description: 'HHS Secretary. Health policy moves biotech and pharma prediction markets.', category: 'politics', color: '#6b7280', tags: ['health', 'policy'] },
  { handle: 'VivekGRamaswamy', label: 'Vivek Ramaswamy', description: 'Former DOGE co-lead. Crypto-friendly policy commentary.', category: 'politics', color: '#f59e0b', tags: ['DOGE', 'regulation'] },

  // Crypto leaders
  { handle: 'brian_armstrong', label: 'Brian Armstrong', description: 'CEO of Coinbase. Major exchange listings, regulatory battles, industry direction.', category: 'crypto', color: '#0052FF', tags: ['Coinbase', 'regulation'] },
  { handle: 'cz_binance', label: 'CZ (Changpeng Zhao)', description: 'Binance founder. Listings announcements, market commentary.', category: 'crypto', color: '#F0B90B', tags: ['Binance', 'listings'] },
  { handle: 'VitalikButerin', label: 'Vitalik Buterin', description: 'Ethereum co-founder. ETH roadmap, L2 commentary, ecosystem direction.', category: 'crypto', color: '#627EEA', tags: ['ETH', 'L2'] },
  { handle: 'saylor', label: 'Michael Saylor', description: 'MicroStrategy chairman. BTC accumulation announcements move markets.', category: 'crypto', color: '#F7931A', tags: ['BTC', 'MicroStrategy'] },
  { handle: 'BarrySilbert', label: 'Barry Silbert', description: 'DCG/Grayscale CEO. Institutional crypto, ETF flows.', category: 'crypto', color: '#4a5568', tags: ['Grayscale', 'ETF'] },
  { handle: 'APompliano', label: 'Anthony Pompliano', description: 'Crypto investor & commentator. Market calls, macro takes.', category: 'crypto', color: '#F7931A', tags: ['BTC', 'macro'] },
  { handle: 'AltcoinGordon', label: 'Altcoin Gordon', description: 'Popular altcoin trader. Alt calls, memecoin alpha.', category: 'crypto', color: '#8b5cf6', tags: ['altcoins', 'calls'] },

  // Solana ecosystem
  { handle: 'aeyakovenko', label: 'Anatoly Yakovenko', description: 'Solana co-founder. Solana roadmap, ecosystem updates, firedancer.', category: 'solana', color: '#9945FF', tags: ['SOL', 'Firedancer'] },
  { handle: 'rajgokal', label: 'Raj Gokal', description: 'Solana co-founder. Ecosystem growth, partnerships, DeFi.', category: 'solana', color: '#14F195', tags: ['SOL', 'DeFi'] },
  { handle: '0xMert_', label: 'Mert', description: 'Helius CEO. Solana infra, RPC, ecosystem alpha.', category: 'solana', color: '#E8590C', tags: ['Helius', 'infra'] },
  { handle: 'weremeow', label: 'meow', description: 'Jupiter co-founder. Largest Solana DEX aggregator. JUP token.', category: 'solana', color: '#00BFA5', tags: ['Jupiter', 'JUP', 'DEX'] },
  { handle: 'armaniferrante', label: 'Armani Ferrante', description: 'Backpack/Mad Lads founder. Solana ecosystem builder.', category: 'solana', color: '#FF6B6B', tags: ['Backpack', 'Mad Lads'] },
  { handle: 'DriftProtocol', label: 'Drift Protocol', description: 'Solana perpetuals DEX. DeFi trading, ecosystem growth.', category: 'solana', color: '#E8590C', tags: ['perps', 'DeFi'] },

  // Memecoins & degen
  { handle: 'MustStopMurad', label: 'Murad', description: 'Memecoin supercycle thesis. Calls memecoins, community tokens.', category: 'memecoins', color: '#22c55e', tags: ['memecoins', 'supercycle'] },
  { handle: 'blknoiz06', label: 'Blknoiz06', description: 'Degen trader. Memecoin and altcoin plays, early calls.', category: 'memecoins', color: '#a855f7', tags: ['degen', 'memecoins'] },
  { handle: 'CryptoGodJohn', label: 'GodJohn', description: 'CT influencer. Memecoin calls, market commentary.', category: 'memecoins', color: '#eab308', tags: ['calls', 'memecoins'] },
  { handle: 'pumpdotfun', label: 'pump.fun', description: 'Solana memecoin launchpad. New token launches.', category: 'memecoins', color: '#06b6d4', tags: ['launchpad', 'SOL'] },
  { handle: 'cb_doge', label: 'CB Doge', description: 'DOGE community. Dogecoin news and sentiment.', category: 'memecoins', color: '#C2A633', tags: ['DOGE', 'memecoins'] },
  { handle: 'solanafloor', label: 'Solana Floor', description: 'Solana NFT and memecoin tracker. Floor prices, new mints.', category: 'memecoins', color: '#9945FF', tags: ['SOL', 'NFT', 'memes'] },

  // Markets & finance
  { handle: 'unusual_whales', label: 'Unusual Whales', description: 'Options flow, congressional trades, market alerts.', category: 'markets', color: '#3b82f6', tags: ['options', 'flow'] },
  { handle: 'DeItaone', label: 'Walter Bloomberg', description: 'Breaking financial news terminal. Fastest market-moving headlines.', category: 'markets', color: '#ef4444', tags: ['breaking', 'headlines'] },
  { handle: 'Schuldensupp', label: 'Schuldensuehner', description: 'Financial news & macro commentary. Bond market, rates analysis.', category: 'markets', color: '#f59e0b', tags: ['macro', 'bonds'] },
  { handle: 'KobeissiLetter', label: 'The Kobeissi Letter', description: 'Macro analysis, market trends, economic data breakdown.', category: 'markets', color: '#10b981', tags: ['macro', 'analysis'] },
  { handle: 'WhaleWire', label: 'Whale Wire', description: 'Whale movements, large transfers, exchange flows.', category: 'markets', color: '#6366f1', tags: ['whales', 'flows'] },
  { handle: 'lookonchain', label: 'Lookonchain', description: 'On-chain analytics. Whale tracking, smart money moves.', category: 'markets', color: '#14b8a6', tags: ['on-chain', 'whales'] },

  // Crypto media
  { handle: 'CoinDesk', label: 'CoinDesk', description: 'Leading crypto news outlet. Breaking stories, market analysis.', category: 'media', color: '#1d4ed8', tags: ['news'] },
  { handle: 'Cointelegraph', label: 'Cointelegraph', description: 'Crypto news and analysis. Industry coverage.', category: 'media', color: '#27AE60', tags: ['news'] },
  { handle: 'TheBlock__', label: 'The Block', description: 'Crypto research and news. Data-driven coverage.', category: 'media', color: '#000000', tags: ['research', 'news'] },
  { handle: 'WuBlockchain', label: 'Wu Blockchain', description: 'Asian crypto market news. Mining, regulation, exchange intel.', category: 'media', color: '#ef4444', tags: ['Asia', 'mining'] },
];

// Deduplicate by handle (remove the duplicate Brian Armstrong)
const UNIQUE_ACCOUNTS = ACCOUNTS.filter((acc, i, arr) =>
  arr.findIndex(a => a.handle === acc.handle) === i
);

interface TwitterFeedProps {
  dark?: boolean;
}

export default function TwitterFeed({ dark = false }: TwitterFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');

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

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`${cardBg} border ${border} rounded-xl px-4 py-3`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={textPrimary}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <div>
              <span className={`text-sm font-semibold ${textPrimary}`}>Market-Moving Accounts</span>
              <span className={`text-xs ${textSecondary} ml-2`}>{filtered.length} accounts</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className={`border rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none ${
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

        {/* Category tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat.key
                  ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-gray-900 text-white')
                  : (dark ? 'text-gray-400 hover:text-white hover:bg-[#1e2130]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className={`${cardBg} border ${border} rounded-xl px-4 py-2.5 flex items-center gap-2`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={textMuted}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span className={`text-xs ${textSecondary}`}>
          Accounts that frequently move crypto prices, prediction markets, and memecoin sentiment. Click to view on X.
        </span>
      </div>

      {/* Account grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(acc => (
          <AccountCard key={acc.handle} account={acc} dark={dark} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={`text-center py-16 ${textMuted}`}>
          <div className="text-3xl mb-3">🔍</div>
          <div className="text-sm">No accounts found</div>
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, dark }: { account: FeedAccount; dark: boolean }) {
  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-600' : 'text-gray-300';

  const categoryLabel = CATEGORIES.find(c => c.key === account.category);

  return (
    <a
      href={`https://x.com/${account.handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardBg} border ${border} rounded-xl p-4 transition-all hover:scale-[1.01] group ${
        dark ? 'hover:border-gray-600 hover:bg-[#1e2130]' : 'hover:border-gray-400 hover:shadow-md'
      }`}
    >
      {/* Top: avatar + name + category */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: account.color }}
        >
          {account.label.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold truncate ${textPrimary}`}>{account.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={`text-[11px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>@{account.handle}</div>
        </div>
      </div>

      {/* Description */}
      <p className={`text-xs mt-2.5 leading-relaxed line-clamp-2 ${textSecondary}`}>
        {account.description}
      </p>

      {/* Tags + category */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          dark ? 'bg-[#2a2d3a] text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {categoryLabel?.emoji} {categoryLabel?.label}
        </span>
        {account.tags?.slice(0, 2).map(tag => (
          <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${
            dark ? 'bg-[#12141e] text-gray-500' : 'bg-gray-50 text-gray-400'
          }`}>
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}
