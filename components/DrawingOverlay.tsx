'use client';

import { Drawing, DrawingPoint, DrawingToolType } from '@/lib/drawing-types';
import { timeToPixelX } from '@/lib/drawing-utils';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DrawingOverlayProps {
  drawings: Drawing[];
  visibleCandles: Candle[];
  xScale: (i: number) => number;
  yScale: (price: number) => number;
  marginLeft: number;
  marginRight: number;
  chartWidth: number; // total SVG width
  selectedDrawingId: string | null;
  onSelect: (id: string | null) => void;
  dark: boolean;
  // In-progress drawing preview
  pendingTool: DrawingToolType | null;
  pendingPoints: DrawingPoint[];
  previewPoint: DrawingPoint | null;
  pendingColor: string;
}

export default function DrawingOverlay({
  drawings,
  visibleCandles,
  xScale,
  yScale,
  marginLeft,
  marginRight,
  chartWidth,
  selectedDrawingId,
  onSelect,
  dark,
  pendingTool,
  pendingPoints,
  previewPoint,
  pendingColor,
}: DrawingOverlayProps) {
  const getX = (time: number): number | null =>
    timeToPixelX(time, visibleCandles, xScale);

  const getY = (price: number): number => yScale(price);

  return (
    <g className="drawing-overlay">
      {/* Completed drawings */}
      {drawings.map(drawing => (
        <DrawingElement
          key={drawing.id}
          drawing={drawing}
          getX={getX}
          getY={getY}
          marginLeft={marginLeft}
          chartWidth={chartWidth}
          marginRight={marginRight}
          isSelected={drawing.id === selectedDrawingId}
          onSelect={() => onSelect(drawing.id)}
          dark={dark}
        />
      ))}

      {/* In-progress preview */}
      {pendingTool && pendingPoints.length > 0 && previewPoint && (
        <PreviewElement
          toolType={pendingTool}
          points={[...pendingPoints, previewPoint]}
          color={pendingColor}
          getX={getX}
          getY={getY}
          marginLeft={marginLeft}
          chartWidth={chartWidth}
          marginRight={marginRight}
        />
      )}

      {/* Single-point tool preview (h-line with just mouse position) */}
      {pendingTool === 'horizontal-line' && pendingPoints.length === 0 && previewPoint && (
        <line
          x1={marginLeft}
          y1={getY(previewPoint.price)}
          x2={chartWidth - marginRight}
          y2={getY(previewPoint.price)}
          stroke={pendingColor}
          strokeWidth={1}
          strokeDasharray="6,4"
          opacity={0.5}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function DrawingElement({
  drawing,
  getX,
  getY,
  marginLeft,
  chartWidth,
  marginRight,
  isSelected,
  onSelect,
  dark,
}: {
  drawing: Drawing;
  getX: (time: number) => number | null;
  getY: (price: number) => number;
  marginLeft: number;
  chartWidth: number;
  marginRight: number;
  isSelected: boolean;
  onSelect: () => void;
  dark: boolean;
}) {
  const { toolType, points, color } = drawing;
  const strokeWidth = isSelected ? 2 : 1.5;
  const hitAreaWidth = 10;

  if (toolType === 'horizontal-line') {
    const y = getY(points[0].price);
    const x1 = marginLeft;
    const x2 = chartWidth - marginRight;
    return (
      <g>
        {/* Hit area */}
        <line
          x1={x1} y1={y} x2={x2} y2={y}
          stroke="transparent"
          strokeWidth={hitAreaWidth}
          cursor="pointer"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        />
        {/* Visible line */}
        <line
          x1={x1} y1={y} x2={x2} y2={y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={isSelected ? undefined : '8,4'}
          pointerEvents="none"
        />
        {/* Price label */}
        <PriceLabel x={x2 + 2} y={y} color={color} isSelected={isSelected} />
        {/* Selection handles */}
        {isSelected && (
          <>
            <circle cx={x1} cy={y} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
            <circle cx={x2} cy={y} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
          </>
        )}
      </g>
    );
  }

  if (toolType === 'trendline') {
    const x1 = getX(points[0].time);
    const y1 = getY(points[0].price);
    const x2 = getX(points[1].time);
    const y2 = getY(points[1].price);
    if (x1 === null || x2 === null) return null;

    return (
      <g>
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent"
          strokeWidth={hitAreaWidth}
          cursor="pointer"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        />
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
        {isSelected && (
          <>
            <circle cx={x1} cy={y1} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
            <circle cx={x2} cy={y2} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
          </>
        )}
      </g>
    );
  }

  if (toolType === 'rectangle') {
    const x1 = getX(points[0].time);
    const y1 = getY(points[0].price);
    const x2 = getX(points[1].time);
    const y2 = getY(points[1].price);
    if (x1 === null || x2 === null) return null;

    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    return (
      <g>
        <rect
          x={rx} y={ry} width={rw} height={rh}
          fill={color}
          fillOpacity={0.08}
          stroke={color}
          strokeWidth={strokeWidth}
          cursor="pointer"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        />
        {isSelected && (
          <>
            <circle cx={x1} cy={y1} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
            <circle cx={x2} cy={y2} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
            <circle cx={x1} cy={y2} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
            <circle cx={x2} cy={y1} r={4} fill={color} stroke={dark ? '#0f1117' : 'white'} strokeWidth={1.5} pointerEvents="none" />
          </>
        )}
      </g>
    );
  }

  return null;
}

function PreviewElement({
  toolType,
  points,
  color,
  getX,
  getY,
  marginLeft,
  chartWidth,
  marginRight,
}: {
  toolType: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  getX: (time: number) => number | null;
  getY: (price: number) => number;
  marginLeft: number;
  chartWidth: number;
  marginRight: number;
}) {
  if (toolType === 'horizontal-line' && points.length >= 1) {
    const y = getY(points[0].price);
    return (
      <line
        x1={marginLeft} y1={y} x2={chartWidth - marginRight} y2={y}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.7}
        pointerEvents="none"
      />
    );
  }

  if (toolType === 'trendline' && points.length >= 2) {
    const x1 = getX(points[0].time);
    const y1 = getY(points[0].price);
    const x2 = getX(points[1].time);
    const y2 = getY(points[1].price);
    if (x1 === null || x2 === null) return null;

    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.7}
        pointerEvents="none"
      />
    );
  }

  if (toolType === 'rectangle' && points.length >= 2) {
    const x1 = getX(points[0].time);
    const y1 = getY(points[0].price);
    const x2 = getX(points[1].time);
    const y2 = getY(points[1].price);
    if (x1 === null || x2 === null) return null;

    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    return (
      <rect
        x={rx} y={ry} width={rw} height={rh}
        fill={color}
        fillOpacity={0.05}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.7}
        pointerEvents="none"
      />
    );
  }

  return null;
}

function PriceLabel({ x, y, color, isSelected }: { x: number; y: number; color: string; isSelected: boolean }) {
  if (!isSelected) return null;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y - 8} width={6} height={16} fill={color} rx={2} />
    </g>
  );
}
