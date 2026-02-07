'use client';

import { useEffect, useRef, useState } from 'react';

interface FeedAccount {
  handle: string;
  label: string;
  color: string;
}

const ACCOUNTS: FeedAccount[] = [
  { handle: 'realDonaldTrump', label: 'Donald Trump', color: '#e74c3c' },
  { handle: 'WhiteHouse', label: 'White House', color: '#1d4ed8' },
  { handle: 'POTUS', label: 'POTUS', color: '#1e3a5f' },
];

interface TwitterFeedProps {
  dark?: boolean;
}

export default function TwitterFeed({ dark = false }: TwitterFeedProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Twitter widgets.js once
  useEffect(() => {
    if (document.getElementById('twitter-wjs')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'twitter-wjs';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';

  const visibleAccounts = selectedAccount === 'all'
    ? ACCOUNTS
    : ACCOUNTS.filter(a => a.handle === selectedAccount);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className={`${cardBg} border ${border} rounded-xl px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={textPrimary}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className={`text-sm font-semibold ${textPrimary}`}>Feed</span>
          <span className={`text-xs ${textSecondary}`}>Market-moving accounts</span>
        </div>

        {/* Account filter */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${dark ? 'bg-[#12141e]' : 'bg-gray-100'}`}>
          <button
            onClick={() => setSelectedAccount('all')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
              selectedAccount === 'all'
                ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
            }`}
          >
            All
          </button>
          {ACCOUNTS.map(acc => (
            <button
              key={acc.handle}
              onClick={() => setSelectedAccount(acc.handle)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                selectedAccount === acc.handle
                  ? (dark ? 'bg-[#2a2d3a] text-white' : 'bg-white text-gray-900 shadow-sm')
                  : (dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className={`${cardBg} border ${border} rounded-xl px-4 py-2.5 flex items-center gap-2`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse`} />
        <span className={`text-xs ${textSecondary}`}>
          Live feed — tweets from tracked accounts that may impact prediction markets and crypto
        </span>
      </div>

      {/* Timeline embeds */}
      <div className={`grid gap-4 ${selectedAccount === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
        {visibleAccounts.map(acc => (
          <TimelineEmbed
            key={acc.handle}
            handle={acc.handle}
            label={acc.label}
            color={acc.color}
            dark={dark}
            scriptLoaded={scriptLoaded}
            tall={selectedAccount !== 'all'}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineEmbed({
  handle, label, color, dark, scriptLoaded, tall,
}: {
  handle: string;
  label: string;
  color: string;
  dark: boolean;
  scriptLoaded: boolean;
  tall: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || renderedRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Create the anchor tag Twitter expects
    const anchor = document.createElement('a');
    anchor.className = 'twitter-timeline';
    anchor.setAttribute('data-theme', dark ? 'dark' : 'light');
    anchor.setAttribute('data-chrome', 'noheader nofooter noborders transparent');
    anchor.setAttribute('data-height', tall ? '800' : '600');
    anchor.setAttribute('data-width', '100%');
    anchor.setAttribute('data-tweet-limit', '10');
    anchor.href = `https://twitter.com/${handle}`;
    anchor.textContent = `Tweets by @${handle}`;

    containerRef.current.appendChild(anchor);

    // Ask Twitter to render the widget
    if ((window as any).twttr?.widgets) {
      (window as any).twttr.widgets.load(containerRef.current);
    }

    renderedRef.current = true;

    return () => {
      renderedRef.current = false;
    };
  }, [scriptLoaded, handle, dark, tall]);

  // Re-render when dark mode changes
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    renderedRef.current = false;
    containerRef.current.innerHTML = '';

    const anchor = document.createElement('a');
    anchor.className = 'twitter-timeline';
    anchor.setAttribute('data-theme', dark ? 'dark' : 'light');
    anchor.setAttribute('data-chrome', 'noheader nofooter noborders transparent');
    anchor.setAttribute('data-height', tall ? '800' : '600');
    anchor.setAttribute('data-width', '100%');
    anchor.setAttribute('data-tweet-limit', '10');
    anchor.href = `https://twitter.com/${handle}`;
    anchor.textContent = `Tweets by @${handle}`;

    containerRef.current.appendChild(anchor);

    if ((window as any).twttr?.widgets) {
      (window as any).twttr.widgets.load(containerRef.current);
    }

    renderedRef.current = true;
  }, [dark, scriptLoaded, handle, tall]);

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';

  return (
    <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
      {/* Account header */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `2px solid ${color}` }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: color }}
        >
          @
        </div>
        <div>
          <div className={`text-sm font-semibold ${textPrimary}`}>{label}</div>
          <div className={`text-[11px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>@{handle}</div>
        </div>
        <a
          href={`https://x.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`ml-auto text-xs px-2.5 py-1 rounded-full border transition ${
            dark
              ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-500'
          }`}
        >
          View on X
        </a>
      </div>

      {/* Embedded timeline */}
      <div ref={containerRef} className="px-1">
        {!scriptLoaded && (
          <div className="flex items-center justify-center py-20">
            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${dark ? 'border-gray-700 border-t-gray-400' : 'border-gray-200 border-t-gray-600'}`} />
          </div>
        )}
      </div>
    </div>
  );
}
