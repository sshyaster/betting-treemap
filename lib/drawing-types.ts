export type DrawingToolType = 'horizontal-line' | 'trendline' | 'rectangle';

export interface DrawingPoint {
  price: number;     // Y in data space
  time: number;      // Unix timestamp (seconds)
}

export interface Drawing {
  id: string;
  toolType: DrawingToolType;
  points: DrawingPoint[];    // 1 for h-line, 2 for trendline/rect
  color: string;
  coinId: string;
  interval: string;
  createdAt: number;
}

export const TOOL_POINT_COUNT: Record<DrawingToolType, number> = {
  'horizontal-line': 1,
  'trendline': 2,
  'rectangle': 2,
};

export const DRAWING_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ffffff', // white
];

export type DrawingAction =
  | { type: 'ADD_DRAWING'; drawing: Drawing }
  | { type: 'DELETE_DRAWING'; id: string }
  | { type: 'SET_DRAWINGS'; drawings: Drawing[] }
  | { type: 'CLEAR_DRAWINGS'; coinId: string; interval: string };
