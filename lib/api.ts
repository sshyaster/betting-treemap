import { Market } from './types';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

// Category mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Politics': ['trump', 'biden', 'election', 'president', 'congress', 'senate', 'governor', 'vote', 'democrat', 'republican', 'political', 'inaugur'],
  'Sports': ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'champion', 'world series', 'playoff', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'ufc', 'boxing', 'premier league', 'uefa'],
  'Crypto': ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'solana', 'dogecoin', 'blockchain'],
  'Economics': ['fed', 'interest rate', 'inflation', 'cpi', 'gdp', 'unemployment', 'recession', 'fomc', 'treasury'],
  'Tech': ['ai', 'openai', 'google', 'apple', 'microsoft', 'tesla', 'spacex', 'tiktok', 'meta', 'nvidia'],
  'Entertainment': ['oscar', 'grammy', 'emmy', 'movie', 'film', 'celebrity', 'award', 'netflix', 'spotify'],
  'World': ['china', 'russia', 'ukraine', 'war', 'israel', 'iran', 'europe', 'asia', 'nato'],
};

function categorize(title: string, eventTicker?: string): string {
  const text = (title + ' ' + (eventTicker || '')).toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'Other';
}

export async function fetchPolymarketData(): Promise<Market[]> {
  try {
    // Fetch active, non-closed markets ordered by 24hr volume (actual recent activity)
    const response = await fetch(
      `${POLYMARKET_API}/events?active=true&closed=false&limit=200&order=volume24hr&ascending=false`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) throw new Error('Polymarket API error');

    const data = await response.json();

    return data
      .filter((event: any) => event.volume24hr > 100) // Filter out inactive markets
      .map((event: any) => ({
        id: `pm-${event.id}`,
        title: event.title || 'Untitled',
        // Use 24hr volume for sizing (actual recent trading activity)
        volume: event.volume24hr || 0,
        openInterest: event.liquidity || 0,
        category: categorize(event.title, event.slug),
        platform: 'polymarket' as const,
        url: `https://polymarket.com/event/${event.slug}`,
        price: event.markets?.[0]?.outcomePrices ?
          JSON.parse(event.markets[0].outcomePrices)[0] : undefined,
      }));
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return [];
  }
}

export async function fetchKalshiData(): Promise<Market[]> {
  try {
    const response = await fetch(
      `${KALSHI_API}/markets?limit=200&status=active`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) throw new Error('Kalshi API error');

    const data = await response.json();

    return (data.markets || [])
      .filter((market: any) => market.volume_24h > 100) // Use 24hr volume
      .map((market: any) => ({
        id: `kalshi-${market.ticker}`,
        title: market.title || 'Untitled',
        // Use 24hr volume for consistency with Polymarket
        volume: market.volume_24h || 0,
        openInterest: market.open_interest || 0,
        category: categorize(market.title, market.event_ticker),
        platform: 'kalshi' as const,
        url: `https://kalshi.com/markets/${market.event_ticker}`,
        price: market.last_price ? market.last_price / 100 : undefined,
      }));
  } catch (error) {
    console.error('Kalshi fetch error:', error);
    return [];
  }
}

export async function fetchAllMarkets(): Promise<Market[]> {
  const [polymarketData, kalshiData] = await Promise.all([
    fetchPolymarketData(),
    fetchKalshiData(),
  ]);

  // Combine and sort by volume
  return [...polymarketData, ...kalshiData]
    .sort((a, b) => b.volume - a.volume);
}
