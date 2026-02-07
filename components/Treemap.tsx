'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { TreemapData, Market } from '@/lib/types';
import { formatVolume } from '@/lib/utils';

interface TreemapProps {
  data: TreemapData;
  width: number;
  height: number;
  onMarketClick?: (market: Market) => void;
  totalVolume: number;
  timeframeLabel?: string;
  dark?: boolean;
}

interface TooltipData {
  title: string;
  volume: number;
  percentTotal: number;
  percentParent?: number;
  parentName?: string;
  x: number;
  y: number;
}

// Category header bar colors (the visible "frame" around children)
const CATEGORY_HEADER: Record<string, string> = {
  'Politics': '#c4e0c5',
  'Sports': '#b4d8f0',
  'Crypto': '#f0c0d0',
  'Economics': '#d0e4b0',
  'Tech': '#d8c4ec',
  'Entertainment': '#f8d8b0',
  'World': '#b0dcd4',
  'Other': '#d4c8ec',
};

// Category frame/padding background (lighter version)
const CATEGORY_FRAME: Record<string, string> = {
  'Politics': '#e8f2e8',
  'Sports': '#dceef8',
  'Crypto': '#fae4ec',
  'Economics': '#e8f0d4',
  'Tech': '#ece0f4',
  'Entertainment': '#fcecd8',
  'World': '#d8ece8',
  'Other': '#e8e0f4',
};

// Leaf node fills — very light tint of category color
const CATEGORY_LEAF: Record<string, string> = {
  'Politics': '#f0f7f0',
  'Sports': '#edf5fc',
  'Crypto': '#fdf0f4',
  'Economics': '#f2f7e8',
  'Tech': '#f4eef8',
  'Entertainment': '#fdf4ec',
  'World': '#ecf4f2',
  'Other': '#f2eef8',
};

// Dark mode category colors
const CATEGORY_HEADER_DARK: Record<string, string> = {
  'Politics': '#2d4a2e',
  'Sports': '#1e3a52',
  'Crypto': '#4a2030',
  'Economics': '#354a1e',
  'Tech': '#3a2850',
  'Entertainment': '#4a3818',
  'World': '#1e403a',
  'Other': '#302848',
};

const CATEGORY_FRAME_DARK: Record<string, string> = {
  'Politics': '#1a2e1c',
  'Sports': '#14283a',
  'Crypto': '#341420',
  'Economics': '#222e14',
  'Tech': '#261c38',
  'Entertainment': '#342610',
  'World': '#142e28',
  'Other': '#221c34',
};

const CATEGORY_LEAF_DARK: Record<string, string> = {
  'Politics': '#1e2a1e',
  'Sports': '#182430',
  'Crypto': '#2a1820',
  'Economics': '#1e2618',
  'Tech': '#201a2c',
  'Entertainment': '#2a2014',
  'World': '#18282a',
  'Other': '#1e1a28',
};

const ZOOM_DURATION = 450;

export default function Treemap({ data, width, height, onMarketClick, totalVolume, timeframeLabel = '24h', dark = false }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewStack, setViewStack] = useState<TreemapData[]>([data]);
  const [isAnimating, setIsAnimating] = useState(false);
  // Store the bounding box of the clicked node for zoom origin
  const zoomTargetRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const zoomDirectionRef = useRef<'in' | 'out'>('in');

  const currentView = viewStack[viewStack.length - 1];

  useEffect(() => {
    setViewStack([data]);
  }, [data]);

  const drillDown = useCallback((node: TreemapData, bounds?: { x0: number; y0: number; x1: number; y1: number }) => {
    if (node.children && node.children.length > 0 && !isAnimating) {
      zoomTargetRef.current = bounds || null;
      zoomDirectionRef.current = 'in';
      setIsAnimating(true);
      setViewStack(prev => [...prev, node]);
    }
  }, [isAnimating]);

  const goBack = useCallback((index: number) => {
    if (isAnimating) return;
    zoomTargetRef.current = null;
    zoomDirectionRef.current = 'out';
    setIsAnimating(true);
    setViewStack(prev => prev.slice(0, index + 1));
  }, [isAnimating]);

  const getCategoryName = useCallback((d: d3.HierarchyRectangularNode<TreemapData>): string => {
    let node: d3.HierarchyRectangularNode<TreemapData> | null = d;
    while (node && node.depth > 1) {
      node = node.parent;
    }
    return node?.data?.name || d.data?.category || '';
  }, []);

  // Helper to get colors based on dark mode
  const getFrameFill = useCallback((cat: string) => {
    return dark
      ? (CATEGORY_FRAME_DARK[cat] || CATEGORY_FRAME_DARK['Other'])
      : (CATEGORY_FRAME[cat] || CATEGORY_FRAME['Other']);
  }, [dark]);

  const getHeaderFill = useCallback((cat: string) => {
    return dark
      ? (CATEGORY_HEADER_DARK[cat] || CATEGORY_HEADER_DARK['Other'])
      : (CATEGORY_HEADER[cat] || CATEGORY_HEADER['Other']);
  }, [dark]);

  const getLeafFill = useCallback((cat: string) => {
    return dark
      ? (CATEGORY_LEAF_DARK[cat] || CATEGORY_LEAF_DARK['Other'])
      : (CATEGORY_LEAF[cat] || CATEGORY_LEAF['Other']);
  }, [dark]);

  useEffect(() => {
    if (!svgRef.current || !currentView || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    const zoomTarget = zoomTargetRef.current;
    const zoomDirection = zoomDirectionRef.current;

    // Compute treemap layout
    const root = d3.hierarchy(currentView)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreemapData>()
      .size([width, height])
      .paddingTop(24)
      .paddingRight(3)
      .paddingBottom(3)
      .paddingLeft(3)
      .paddingInner(2)
      .round(true)(root);

    type RectNode = d3.HierarchyRectangularNode<TreemapData>;
    const nodes = root.descendants() as RectNode[];
    const parentNodes = nodes.filter(d => d.depth > 0 && d.children);
    const leafNodes = nodes.filter(d => d.depth > 0 && !d.children);

    // --- ZOOM ANIMATION ---
    if (isAnimating) {
      // Remove ALL existing content groups first to prevent accumulation
      const oldGroups = svg.selectAll<SVGGElement, unknown>('g.content');

      if (zoomDirection === 'in' && zoomTarget) {
        // Zoom IN: old content scales up from clicked box, fades out, new content fades in
        if (!oldGroups.empty()) {
          const sx = width / (zoomTarget.x1 - zoomTarget.x0);
          const sy = height / (zoomTarget.y1 - zoomTarget.y0);
          const tx = -zoomTarget.x0 * sx;
          const ty = -zoomTarget.y0 * sy;

          oldGroups
            .transition()
            .duration(ZOOM_DURATION)
            .attr('transform', `translate(${tx},${ty}) scale(${sx},${sy})`)
            .style('opacity', 0)
            .on('end', function() { d3.select(this).remove(); });
        }

        // Draw new content starting transparent, then fade in
        const newG = drawTreemap(svg, parentNodes, leafNodes, 0);
        newG
          .transition()
          .delay(ZOOM_DURATION * 0.3)
          .duration(ZOOM_DURATION * 0.7)
          .style('opacity', 1)
          .on('end', () => setIsAnimating(false));

      } else {
        // Zoom OUT: old content fades, new content zooms from center to normal
        if (!oldGroups.empty()) {
          oldGroups
            .transition()
            .duration(ZOOM_DURATION * 0.4)
            .style('opacity', 0)
            .on('end', function() { d3.select(this).remove(); });
        }

        const g = drawTreemap(svg, parentNodes, leafNodes, 0);
        const cx = width / 2;
        const cy = height / 2;
        const startScale = 1.3;
        const startTx = cx * (1 - startScale);
        const startTy = cy * (1 - startScale);

        g.attr('transform', `translate(${startTx},${startTy}) scale(${startScale},${startScale})`)
          .style('opacity', 0)
          .transition()
          .delay(ZOOM_DURATION * 0.2)
          .duration(ZOOM_DURATION * 0.8)
          .attr('transform', 'translate(0,0) scale(1,1)')
          .style('opacity', 1)
          .on('end', () => setIsAnimating(false));
      }

      zoomTargetRef.current = null;
      return;
    }

    // --- NORMAL DRAW (no animation) ---
    svg.selectAll('*').remove();
    drawTreemap(svg, parentNodes, leafNodes, 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, width, height, dark]);

  function drawTreemap(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    parentNodes: d3.HierarchyRectangularNode<TreemapData>[],
    leafNodes: d3.HierarchyRectangularNode<TreemapData>[],
    initialOpacity: number
  ) {
    type RectNode = d3.HierarchyRectangularNode<TreemapData>;

    const g = svg.append('g')
      .attr('class', 'content')
      .style('opacity', initialOpacity);

    // --- PARENT NODES ---
    const parentGroups = g.selectAll<SVGGElement, RectNode>('g.parent')
      .data(parentNodes)
      .enter()
      .append('g')
      .attr('class', 'parent');

    parentGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => getFrameFill(getCategoryName(d)))
      .attr('stroke', d => d.depth === 1 ? (dark ? '#555' : '#222') : (dark ? '#444' : '#999'))
      .attr('stroke-width', d => d.depth === 1 ? 2 : 1)
      .attr('cursor', 'pointer')
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        drillDown(d.data, { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 });
      });

    // Header bar
    parentGroups.append('rect')
      .attr('x', d => d.x0 + (d.depth === 1 ? 1 : 0.5))
      .attr('y', d => d.y0 + (d.depth === 1 ? 1 : 0.5))
      .attr('width', d => Math.max(0, d.x1 - d.x0 - (d.depth === 1 ? 2 : 1)))
      .attr('height', 22)
      .attr('fill', d => getHeaderFill(getCategoryName(d)))
      .attr('pointer-events', 'none');

    // Header text
    parentGroups.append('text')
      .attr('x', d => d.x0 + 6)
      .attr('y', d => d.y0 + 16)
      .attr('fill', dark ? '#e5e7eb' : '#111')
      .attr('font-size', d => d.depth === 1 ? '13px' : '11px')
      .attr('font-weight', d => d.depth === 1 ? '700' : '600')
      .attr('pointer-events', 'none')
      .text(d => {
        const w = d.x1 - d.x0;
        if (w < 40) return '';
        const name = d.data?.name || '';
        const vol = formatVolume(d.value || 0);
        const full = `${name} ${vol}`;
        const charWidth = d.depth === 1 ? 8 : 7;
        const maxChars = Math.floor(w / charWidth);
        if (full.length <= maxChars) return full;
        if (name.length > maxChars - 1) return name.slice(0, maxChars - 2) + '…';
        return name;
      });

    // Volume text right-aligned for depth-1
    parentGroups.filter(d => d.depth === 1)
      .append('text')
      .attr('x', d => d.x1 - 6)
      .attr('y', d => d.y0 + 16)
      .attr('fill', dark ? '#9ca3af' : '#555')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('text-anchor', 'end')
      .attr('pointer-events', 'none')
      .text(d => {
        const w = d.x1 - d.x0;
        const name = d.data?.name || '';
        const vol = formatVolume(d.value || 0);
        const full = `${name} ${vol}`;
        const maxChars = Math.floor(w / 8);
        if (full.length <= maxChars) return '';
        if (w < 80) return '';
        return vol;
      });

    // --- LEAF NODES ---
    const leafGroups = g.selectAll<SVGGElement, RectNode>('g.leaf')
      .data(leafNodes)
      .enter()
      .append('g')
      .attr('class', 'leaf');

    leafGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => getLeafFill(getCategoryName(d)))
      .attr('stroke', dark ? '#555' : '#bbb')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d) {
        d3.select(this).attr('stroke', dark ? '#aaa' : '#000').attr('stroke-width', 2);

        const percentTotal = totalVolume > 0 ? ((d.value || 0) / totalVolume) * 100 : 0;
        const parentValue = d.parent?.value;
        const percentParent = parentValue ? ((d.value || 0) / parentValue) * 100 : undefined;

        setTooltip({
          title: d.data?.name || '',
          volume: d.value || 0,
          percentTotal,
          percentParent,
          parentName: d.parent?.data?.name,
          x: event.pageX,
          y: event.pageY,
        });
      })
      .on('mousemove', (event: MouseEvent) => {
        setTooltip(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', dark ? '#555' : '#bbb').attr('stroke-width', 1);
        setTooltip(null);
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        const nodeData = d.data as any;
        if (nodeData?.market && onMarketClick) {
          onMarketClick(nodeData.market);
        } else if (d.children && d.children.length > 0) {
          drillDown(d.data, { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 });
        }
      });

    // Leaf labels
    leafGroups.each(function(d) {
      const lg = d3.select(this);
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;

      if (w < 35 || h < 20) return;

      const name = d.data?.name || '';
      const maxChars = Math.floor(w / 7);
      const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;

      lg.append('text')
        .attr('x', d.x0 + 5)
        .attr('y', d.y0 + 15)
        .attr('fill', dark ? '#e5e7eb' : '#222')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('pointer-events', 'none')
        .text(displayName);

      if (h >= 32 && w >= 50) {
        lg.append('text')
          .attr('x', d.x0 + 5)
          .attr('y', d.y0 + 28)
          .attr('fill', dark ? '#9ca3af' : '#888')
          .attr('font-size', '10px')
          .attr('font-weight', '400')
          .attr('pointer-events', 'none')
          .text(formatVolume(d.value || 0));
      }
    });

    // Outer border
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', dark ? '#555' : '#222')
      .attr('stroke-width', 2);

    return g;
  }

  return (
    <div className="relative">
      {/* Breadcrumb header */}
      <div className={`border-2 border-b-0 px-4 py-2 flex items-center justify-between ${dark ? 'bg-[#1a1d27] border-gray-600' : 'bg-white border-gray-800'}`}>
        <div className="flex items-center gap-1 text-sm">
          {viewStack.map((view, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="text-gray-400 mx-1">/</span>}
              <button
                onClick={() => goBack(index)}
                disabled={isAnimating}
                className={`hover:underline ${
                  index === viewStack.length - 1
                    ? (dark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold')
                    : (dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                {view.name || 'All Markets'}
              </button>
            </span>
          ))}
        </div>
        <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          {timeframeLabel === 'Open Interest' ? 'Open Interest' : `${timeframeLabel} Volume`}{' '}
          <span className={`font-bold ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{formatVolume(totalVolume)}</span>
        </div>
      </div>

      {/* Treemap SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={`block ${dark ? 'bg-[#141620]' : 'bg-white'}`}
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          overflow: 'hidden',
        }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-4 py-3 shadow-xl pointer-events-none min-w-[200px]"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 240),
            top: Math.min(tooltip.y + 12, window.innerHeight - 140),
          }}
        >
          <div className="font-semibold text-sm mb-2">{tooltip.title}</div>
          <div className="text-green-400 text-xl font-bold mb-2">
            {formatVolume(tooltip.volume)}
          </div>
          <div className="text-gray-300 text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-white">{tooltip.percentTotal.toFixed(1)}%</span>
              <span className="text-gray-500">of Total</span>
            </div>
            {tooltip.percentParent !== undefined && tooltip.parentName && (
              <div className="flex justify-between gap-4">
                <span className="text-white">{tooltip.percentParent.toFixed(1)}%</span>
                <span className="text-gray-500">of {tooltip.parentName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
