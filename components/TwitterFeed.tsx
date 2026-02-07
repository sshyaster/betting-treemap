'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const [scriptError, setScriptError] = useState(false);

  // Load Twitter widgets.js
  useEffect(() => {
    if ((window as any).twttr?.widgets) {
      setScriptLoaded(true);
      return;
    }

    // Remove old script if exists
    const existing = document.getElementById('twitter-wjs');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'twitter-wjs';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => {
      // Twitter sets twttr.ready
      if ((window as any).twttr?.widgets) {
        setScriptLoaded(true);
      } else {
        // Wait for twttr.ready
        (window as any).twttr?.ready?.(() => setScriptLoaded(true));
        // Fallback timeout
        setTimeout(() => {
          if ((window as any).twttr?.widgets) setScriptLoaded(true);
          else setScriptError(true);
        }, 3000);
      }
    };
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
  }, []);

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

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
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className={`text-xs ${textSecondary}`}>
          Live feed — tweets from tracked accounts that may impact prediction markets and crypto
        </span>
      </div>

      {/* Timeline columns */}
      <div className={`grid gap-4 ${selectedAccount === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
        {visibleAccounts.map(acc => (
          <TimelineColumn
            key={`${acc.handle}-${dark}`}
            handle={acc.handle}
            label={acc.label}
            color={acc.color}
            dark={dark}
            scriptLoaded={scriptLoaded}
            scriptError={scriptError}
            tall={selectedAccount !== 'all'}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineColumn({
  handle, label, color, dark, scriptLoaded, scriptError, tall,
}: {
  handle: string;
  label: string;
  color: string;
  dark: boolean;
  scriptLoaded: boolean;
  scriptError: boolean;
  tall: boolean;
}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!scriptLoaded || !widgetRef.current) return;

    // Clear previous content
    widgetRef.current.innerHTML = '';
    setWidgetFailed(false);

    const twttr = (window as any).twttr;
    if (!twttr?.widgets?.createTimeline) {
      setWidgetFailed(true);
      return;
    }

    // Use the programmatic API
    twttr.widgets.createTimeline(
      { sourceType: 'profile', screenName: handle },
      widgetRef.current,
      {
        height: tall ? 800 : 600,
        theme: dark ? 'dark' : 'light',
        chrome: 'noheader nofooter noborders transparent',
        dnt: true,
        tweetLimit: 15,
      }
    ).then((el: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!el) setWidgetFailed(true);
    }).catch(() => {
      setWidgetFailed(true);
    });

    // Timeout fallback
    timeoutRef.current = setTimeout(() => {
      if (widgetRef.current && !widgetRef.current.querySelector('iframe')) {
        setWidgetFailed(true);
      }
    }, 8000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scriptLoaded, handle, dark, tall]);

  const cardBg = dark ? 'bg-[#181b25]' : 'bg-white';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const textPrimary = dark ? 'text-gray-100' : 'text-gray-900';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';
  const feedHeight = tall ? 800 : 600;

  const showFallback = scriptError || widgetFailed;

  return (
    <div className={`${cardBg} border ${border} rounded-xl overflow-hidden flex flex-col`}>
      {/* Account header */}
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: `2px solid ${color}` }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: color }}
        >
          @
        </div>
        <div>
          <div className={`text-sm font-semibold ${textPrimary}`}>{label}</div>
          <div className={`text-[11px] ${textMuted}`}>@{handle}</div>
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

      {/* Scrollable timeline area */}
      <div className="overflow-y-auto flex-1" style={{ height: feedHeight }}>
        {showFallback ? (
          /* Fallback: direct iframe embed */
          <div className="h-full">
            <iframe
              src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?dnt=true&embedId=tw-${handle}&lang=en&theme=${dark ? 'dark' : 'light'}&showReplies=false`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={`@${handle} timeline`}
            />
          </div>
        ) : !scriptLoaded ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${dark ? 'border-gray-700 border-t-gray-400' : 'border-gray-200 border-t-gray-600'}`} />
            <span className={`text-xs ${textMuted}`}>Loading feed...</span>
          </div>
        ) : (
          /* Twitter widget renders here */
          <div ref={widgetRef} className="min-h-[200px]" />
        )}
      </div>
    </div>
  );
}
