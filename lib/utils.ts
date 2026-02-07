import { Market, TreemapData, Timeframe } from './types';

export function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function getVolumeForTimeframe(market: Market, timeframe: Timeframe): number {
  switch (timeframe) {
    case '24h': return market.volume24hr;
    case '1w': return market.volume1wk;
    case '1m': return market.volume1mo;
    case '1y': return market.volume1yr;
    case 'all': return market.volumeAll;
    case 'oi': return market.openInterest;
  }
}

// Subcategory mapping
const SUBCATEGORY_KEYWORDS: Record<string, Record<string, string[]>> = {
  'Politics': {
    'US Elections': ['president', 'election 2028', 'nominee', 'primary', 'electoral', 'inaugur'],
    'Legislature': ['congress', 'senate', 'house', 'bill', 'shutdown'],
    'Appointments': ['nominate', 'fed chair', 'cabinet', 'appoint', 'confirm'],
    'Foreign Policy': ['iran', 'china', 'russia', 'ukraine', 'israel', 'taiwan', 'nato'],
  },
  'Sports': {
    'NBA': ['nba', 'basketball', 'lakers', 'celtics', 'warriors'],
    'NFL': ['nfl', 'super bowl', 'football', 'chiefs', 'eagles', 'patriots', 'seahawks'],
    'Soccer': ['premier league', 'la liga', 'champions league', 'fifa', 'world cup', 'soccer'],
    'Esports': ['lol', 'cs2', 'dota', 'esport', 'gaming', 'league of legends'],
  },
  'Crypto': {
    'Bitcoin': ['bitcoin', 'btc'],
    'Ethereum': ['ethereum', 'eth'],
    'Altcoins': ['solana', 'dogecoin', 'altcoin', 'meme coin'],
  },
  'Economics': {
    'Fed': ['fed', 'fomc', 'rate cut', 'rate hike', 'powell'],
    'Inflation': ['cpi', 'inflation', 'pce'],
  },
};

function getSubcategory(market: Market): string {
  const title = market.title.toLowerCase();
  const categoryRules = SUBCATEGORY_KEYWORDS[market.category];

  if (categoryRules) {
    for (const [subcat, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(kw => title.includes(kw))) {
        return subcat;
      }
    }
  }

  return 'Other';
}

export function buildTreemapData(markets: Market[], timeframe: Timeframe = '24h'): TreemapData {
  // Group by category -> subcategory -> markets
  const categoryMap = new Map<string, Map<string, Market[]>>();

  for (const market of markets) {
    // Skip markets with 0 volume in the selected timeframe
    const vol = getVolumeForTimeframe(market, timeframe);
    if (vol <= 0) continue;

    if (!categoryMap.has(market.category)) {
      categoryMap.set(market.category, new Map());
    }

    const subcat = getSubcategory(market);
    const subcatMap = categoryMap.get(market.category)!;

    if (!subcatMap.has(subcat)) {
      subcatMap.set(subcat, []);
    }
    subcatMap.get(subcat)!.push(market);
  }

  // Build hierarchy
  const categoryChildren: TreemapData[] = [];

  for (const [categoryName, subcatMap] of categoryMap) {
    const subcatChildren: TreemapData[] = [];
    let categoryVolume = 0;

    for (const [subcatName, subcatMarkets] of subcatMap) {
      // Sort markets by volume for this timeframe
      subcatMarkets.sort((a, b) => getVolumeForTimeframe(b, timeframe) - getVolumeForTimeframe(a, timeframe));

      const subcatVolume = subcatMarkets.reduce((sum, m) => sum + getVolumeForTimeframe(m, timeframe), 0);
      categoryVolume += subcatVolume;

      // Take top markets, group rest as "+X others"
      const MAX_VISIBLE = 8;
      const visibleMarkets = subcatMarkets.slice(0, MAX_VISIBLE);
      const hiddenMarkets = subcatMarkets.slice(MAX_VISIBLE);

      const marketChildren: TreemapData[] = visibleMarkets.map(m => ({
        name: m.title,
        value: getVolumeForTimeframe(m, timeframe),
        market: m,
        category: categoryName,
      }));

      if (hiddenMarkets.length > 0) {
        marketChildren.push({
          name: `+${hiddenMarkets.length} others`,
          children: hiddenMarkets.map(m => ({
            name: m.title,
            value: getVolumeForTimeframe(m, timeframe),
            market: m,
            category: categoryName,
          })),
          category: categoryName,
        });
      }

      subcatChildren.push({
        name: subcatName,
        children: marketChildren,
        category: categoryName,
      });
    }

    // Sort subcategories by volume
    subcatChildren.sort((a, b) => {
      const aVol = a.children?.reduce((s, c) => s + (c.value || 0), 0) || 0;
      const bVol = b.children?.reduce((s, c) => s + (c.value || 0), 0) || 0;
      return bVol - aVol;
    });

    categoryChildren.push({
      name: categoryName,
      children: subcatChildren,
      category: categoryName,
    });
  }

  // Sort categories by volume, but always push "Other" to the end
  categoryChildren.sort((a, b) => {
    if (a.name === 'Other') return 1;
    if (b.name === 'Other') return -1;
    const aVol = a.children?.reduce((s, sub) => s + (sub.children?.reduce((s2, c) => s2 + (c.value || 0), 0) || 0), 0) || 0;
    const bVol = b.children?.reduce((s, sub) => s + (sub.children?.reduce((s2, c) => s2 + (c.value || 0), 0) || 0), 0) || 0;
    return bVol - aVol;
  });

  return {
    name: 'All Markets',
    children: categoryChildren,
  };
}
