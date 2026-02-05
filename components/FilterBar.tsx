'use client';

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

const CATEGORY_COLORS: Record<string, string> = {
  'Politics': '#c8e6c9',
  'Sports': '#bbdefb',
  'Crypto': '#fff9c4',
  'Economics': '#f0f4c3',
  'Tech': '#e1bee7',
  'Entertainment': '#ffccbc',
  'World': '#b2dfdb',
  'Other': '#e0e0e0',
};

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
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-8">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Volume</div>
            <div className="text-xl font-semibold text-gray-900">{formatVolume(totalVolume)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Markets</div>
            <div className="text-xl font-semibold text-gray-900">{marketCount}</div>
          </div>
        </div>

        {/* Platform Filters */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm mr-2">Platform</span>
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all border ${
                selectedPlatforms.includes(platform)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 text-sm mr-2">Category</span>
          {categories.slice(0, 8).map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${
                selectedCategories.length === 0 || selectedCategories.includes(category)
                  ? 'opacity-100'
                  : 'opacity-40'
              }`}
              style={{
                backgroundColor: selectedCategories.includes(category)
                  ? CATEGORY_COLORS[category]
                  : '#fff',
                borderColor: CATEGORY_COLORS[category],
                color: '#333',
              }}
            >
              {category}
            </button>
          ))}
          {selectedCategories.length > 0 && (
            <button
              onClick={() => onCategoryChange([])}
              className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
