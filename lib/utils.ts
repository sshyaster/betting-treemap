import { Market, TreemapData } from './types';

export function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// Category colors
export const CATEGORY_COLORS: Record<string, string> = {
  'Politics': '#8b7355',
  'Sports': '#c17f59',
  'Crypto': '#d4a84b',
  'Economics': '#7a9e7e',
  'Tech': '#8b7cb3',
  'Entertainment': '#c97b84',
  'World': '#6b8cae',
  'Other': '#808080',
  // Subcategories
  'US Elections': '#9c8465',
  'Foreign Policy': '#7a6b5a',
  'Legislature': '#a08060',
  'Appointments': '#b09070',
  'NBA': '#d4956b',
  'NFL': '#c4855b',
  'Soccer': '#b4754b',
  'Esports': '#a4653b',
  'Bitcoin': '#e4b856',
  'Ethereum': '#c49836',
  'Altcoins': '#a47816',
  'Fed': '#6a8e6e',
  'Inflation': '#5a7e5e',
  '+others': '#606060',
};

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

export function buildNestedTreemapData(markets: Market[]): TreemapData {
  // Group by category -> subcategory -> markets
  const categoryMap = new Map<string, Map<string, Market[]>>();

  for (const market of markets) {
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
      // Sort markets by volume
      subcatMarkets.sort((a, b) => b.volume - a.volume);

      const subcatVolume = subcatMarkets.reduce((sum, m) => sum + m.volume, 0);
      categoryVolume += subcatVolume;

      // Take top markets, group rest as "+X others"
      const MAX_VISIBLE = 8;
      const visibleMarkets = subcatMarkets.slice(0, MAX_VISIBLE);
      const hiddenMarkets = subcatMarkets.slice(MAX_VISIBLE);

      const marketChildren: TreemapData[] = visibleMarkets.map(m => ({
        name: m.title,
        value: m.volume,
        market: m,
        category: categoryName,
      }));

      // Add "+X others" node if there are hidden markets
      if (hiddenMarkets.length > 0) {
        const othersVolume = hiddenMarkets.reduce((sum, m) => sum + m.volume, 0);
        marketChildren.push({
          name: `+${hiddenMarkets.length} others`,
          value: othersVolume,
          category: categoryName,
          isOthers: true,
          hiddenMarkets: hiddenMarkets,
        } as TreemapData & { isOthers: boolean; hiddenMarkets: Market[] });
      }

      subcatChildren.push({
        name: subcatName,
        children: marketChildren,
        category: categoryName,
        totalVolume: subcatVolume,
      } as TreemapData & { totalVolume: number });
    }

    // Sort subcategories by volume
    subcatChildren.sort((a, b) => {
      const aVol = (a as any).totalVolume || a.children?.reduce((s, c) => s + (c.value || 0), 0) || 0;
      const bVol = (b as any).totalVolume || b.children?.reduce((s, c) => s + (c.value || 0), 0) || 0;
      return bVol - aVol;
    });

    categoryChildren.push({
      name: categoryName,
      children: subcatChildren,
      category: categoryName,
      totalVolume: categoryVolume,
    } as TreemapData & { totalVolume: number });
  }

  // Sort categories by volume
  categoryChildren.sort((a, b) => {
    const aVol = (a as any).totalVolume || 0;
    const bVol = (b as any).totalVolume || 0;
    return bVol - aVol;
  });

  return {
    name: 'All Markets',
    children: categoryChildren,
  };
}

// Legacy function for compatibility
export function buildTreemapData(
  markets: Market[],
  groupBy: 'category' | 'platform' = 'category'
): TreemapData {
  return buildNestedTreemapData(markets);
}
