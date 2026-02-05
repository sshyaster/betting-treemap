'use client';

import { CATEGORY_COLORS } from '@/lib/utils';

interface FilterBarProps {
  platforms: string[];
  selectedPlatforms: string[];
  onPlatformChange: (platforms: string[]) => void;
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  totalVolume: number;
  marketCount: number;
}

export default function FilterBar({
  platforms,
  selectedPlatforms,
  onPlatformChange,
  categories,
  selectedCategories,
  onCategoryChange,
  totalVolume,
  marketCount,
}: FilterBarProps) {

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        onPlatformChange(selectedPlatforms.filter(p => p !== platform));
      }
    } else {
      onPlatformChange([...selectedPlatforms, platform]);
    }
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const formatVolume = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${(v / 1e3).toFixed(0)}K`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">24h Volume</div>
            <div className="text-2xl font-bold text-white">{formatVolume(totalVolume)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">Markets</div>
            <div className="text-2xl font-bold text-white">{marketCount}</div>
          </div>
        </div>

        {/* Platform Filters */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm mr-2">Platform:</span>
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedPlatforms.includes(platform)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 text-sm mr-2">Category:</span>
          {categories.slice(0, 8).map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                selectedCategories.length === 0 || selectedCategories.includes(category)
                  ? 'opacity-100'
                  : 'opacity-40'
              }`}
              style={{
                backgroundColor: selectedCategories.includes(category)
                  ? CATEGORY_COLORS[category]
                  : `${CATEGORY_COLORS[category]}66`,
                color: '#fff',
              }}
            >
              {category}
            </button>
          ))}
          {selectedCategories.length > 0 && (
            <button
              onClick={() => onCategoryChange([])}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-600 text-gray-300 hover:bg-gray-500"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
