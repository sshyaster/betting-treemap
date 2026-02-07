'use client';

import { DrawingToolType, DRAWING_COLORS } from '@/lib/drawing-types';

interface DrawingToolbarProps {
  activeTool: DrawingToolType | null;
  onToolChange: (tool: DrawingToolType | null) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  selectedDrawingId: string | null;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  drawingCount: number;
  dark: boolean;
}

export default function DrawingToolbar({
  activeTool,
  onToolChange,
  selectedColor,
  onColorChange,
  selectedDrawingId,
  onDeleteSelected,
  onClearAll,
  drawingCount,
  dark,
}: DrawingToolbarProps) {
  const bg = dark ? 'bg-[#1a1d27]' : 'bg-gray-50';
  const border = dark ? 'border-[#2a2d3a]' : 'border-gray-200';
  const btnBase = `w-8 h-8 flex items-center justify-center rounded-md transition-all`;
  const btnInactive = dark
    ? 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d3a]'
    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200';
  const btnActive = dark
    ? 'text-white bg-[#2a2d3a] ring-1 ring-blue-500/50'
    : 'text-gray-900 bg-white shadow-sm ring-1 ring-gray-300';

  const tools: { type: DrawingToolType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'horizontal-line',
      label: 'Horizontal Line',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="8" x2="15" y2="8" />
          <line x1="1" y1="8" x2="3" y2="6" />
          <line x1="1" y1="8" x2="3" y2="10" />
        </svg>
      ),
    },
    {
      type: 'trendline',
      label: 'Trend Line',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2" y1="14" x2="14" y2="2" />
          <circle cx="2" cy="14" r="1.5" fill="currentColor" />
          <circle cx="14" cy="2" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'rectangle',
      label: 'Rectangle',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="12" height="10" rx="1" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`absolute left-2 top-2 z-10 flex flex-col gap-1 p-1 rounded-lg border ${bg} ${border}`}>
      {/* Drawing tools */}
      {tools.map(tool => (
        <button
          key={tool.type}
          title={tool.label}
          className={`${btnBase} ${activeTool === tool.type ? btnActive : btnInactive}`}
          onClick={() => onToolChange(activeTool === tool.type ? null : tool.type)}
        >
          {tool.icon}
        </button>
      ))}

      {/* Divider */}
      <div className={`h-px mx-1 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />

      {/* Color picker */}
      <div className="relative group">
        <button
          title="Color"
          className={`${btnBase} ${btnInactive}`}
        >
          <div className="w-4 h-4 rounded-full border border-current/20" style={{ backgroundColor: selectedColor }} />
        </button>
        {/* Color popup */}
        <div className={`absolute left-full ml-1 top-0 hidden group-hover:flex flex-wrap gap-1 p-1.5 rounded-lg border ${bg} ${border} w-[76px]`}>
          {DRAWING_COLORS.map(color => (
            <button
              key={color}
              className={`w-4 h-4 rounded-full transition-transform ${selectedColor === color ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`h-px mx-1 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />

      {/* Delete selected */}
      <button
        title="Delete Selected"
        className={`${btnBase} ${selectedDrawingId ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : (dark ? 'text-gray-700' : 'text-gray-300')} ${!selectedDrawingId ? 'cursor-not-allowed' : ''}`}
        disabled={!selectedDrawingId}
        onClick={onDeleteSelected}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
        </svg>
      </button>

      {/* Clear all */}
      <button
        title="Clear All Drawings"
        className={`${btnBase} ${drawingCount > 0 ? (dark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50') : (dark ? 'text-gray-700' : 'text-gray-300')} ${drawingCount === 0 ? 'cursor-not-allowed' : ''}`}
        disabled={drawingCount === 0}
        onClick={onClearAll}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <line x1="5" y1="5" x2="11" y2="11" />
          <line x1="11" y1="5" x2="5" y2="11" />
        </svg>
      </button>
    </div>
  );
}
