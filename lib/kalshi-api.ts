import { Market } from './types';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

// Map Kalshi categories to our unified categories
const KALSHI_CATEGORY_MAP: Record<string, string> = {
  'Politics': 'Politics',
  'Elections': 'Politics',
  'Economics': 'Economics',
  'Financials': 'Economics',
  'Entertainment': 'Entertainment',
  'Sports': 'Sports',
  'Science and Technology': 'Tech',
  'Companies': 'Tech',
  'World': 'World',
  'Climate and Weather': 'World',
  'Health': 'Other',
  'Social': 'Other',
  'Transportation': 'Other',
};

function mapCategory(kalshiCategory: string): string {
  return KALSHI_CATEGORY_MAP[kalshiCategory] || 'Other';
}

export async function fetchKalshiMarkets(): Promise<Market[]> {
  try {
    // Fetch events with nested markets (Kalshi returns volume per market)
    const allEvents: any[] = [];
    let cursor = '';
    const maxPages = 3; // Up to 600 events

    for (let page = 0; page < maxPages; page++) {
      const url = `${KALSHI_API}/events?limit=200&status=open&with_nested_markets=true${
        cursor ? `&cursor=${cursor}` : ''
      }`;

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Kalshi API error');

      const data = await response.json();
      const events = data.events || [];
      allEvents.push(...events);

      cursor = data.cursor || '';
      if (!cursor || events.length < 200) break;
    }

    // Aggregate markets by event and convert to our Market type
    const markets: Market[] = [];

    for (const event of allEvents) {
      const eventMarkets = event.markets || [];
      if (eventMarkets.length === 0) continue;

      // Sum up volume across all markets in this event
      const volume24h = eventMarkets.reduce(
        (sum: number, m: any) => sum + (m.volume_24h || 0), 0
      );
      const volumeAll = eventMarkets.reduce(
        (sum: number, m: any) => sum + (m.volume || 0), 0
      );
      const openInterest = eventMarkets.reduce(
        (sum: number, m: any) => sum + (m.open_interest || 0), 0
      );

      // Skip events with very low volume
      if (volumeAll < 100) continue;

      // Get best yes price from first market
      const firstMarket = eventMarkets[0];
      const yesPrice = firstMarket?.last_price
        ? firstMarket.last_price / 100
        : undefined;

      const category = mapCategory(event.category || 'Other');
      const eventTicker = event.event_ticker || '';

      markets.push({
        id: `kl-${eventTicker}`,
        title: event.title || 'Untitled',
        volume: volume24h, // Use 24h as default volume
        volume24hr: volume24h,
        // Kalshi only provides 24h and all-time, estimate others
        volume1wk: Math.min(volume24h * 7, volumeAll),
        volume1mo: Math.min(volume24h * 30, volumeAll),
        volume1yr: volumeAll,
        volumeAll,
        openInterest,
        category,
        platform: 'kalshi' as const,
        url: `https://kalshi.com/markets/${event.series_ticker || eventTicker}`,
        price: yesPrice,
      });
    }

    return markets.sort((a, b) => b.volume24hr - a.volume24hr);
  } catch (error) {
    console.error('Kalshi fetch error:', error);
    return [];
  }
}
