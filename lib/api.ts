import { Market } from './types';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Politics': ['trump', 'biden', 'election', 'president', 'congress', 'senate', 'governor', 'vote', 'democrat', 'republican', 'political', 'inaugur'],
  'Sports': ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'champion', 'world series', 'playoff', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'ufc', 'boxing', 'premier league', 'uefa'],
  'Crypto': ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'solana', 'dogecoin', 'blockchain'],
  'Economics': ['fed', 'interest rate', 'inflation', 'cpi', 'gdp', 'unemployment', 'recession', 'fomc', 'treasury'],
  'Tech': ['ai', 'openai', 'google', 'apple', 'microsoft', 'tesla', 'spacex', 'tiktok', 'meta', 'nvidia'],
  'Entertainment': ['oscar', 'grammy', 'emmy', 'movie', 'film', 'celebrity', 'award', 'netflix', 'spotify'],
  'World': ['china', 'russia', 'ukraine', 'war', 'israel', 'iran', 'europe', 'asia', 'nato'],
};

function categorize(title: string, slug?: string): string {
  const text = (title + ' ' + (slug || '')).toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'Other';
}

export async function fetchAllMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(
      `${POLYMARKET_API}/events?active=true&closed=false&limit=200&order=volume24hr&ascending=false`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) throw new Error('Polymarket API error');

    const data = await response.json();

    return data
      .filter((event: any) => event.volume > 1000)
      .map((event: any) => ({
        id: `pm-${event.id}`,
        title: event.title || 'Untitled',
        volume: event.volume || 0,
        openInterest: event.liquidity || 0,
        category: categorize(event.title, event.slug),
        platform: 'polymarket' as const,
        url: `https://polymarket.com/event/${event.slug}`,
        price: event.markets?.[0]?.outcomePrices ?
          JSON.parse(event.markets[0].outcomePrices)[0] : undefined,
      }))
      .sort((a: Market, b: Market) => b.volume - a.volume);
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return [];
  }
}
