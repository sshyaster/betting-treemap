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

export default function Treemap({ data, width, height, onMarketClick, totalVolume, timeframeLabel = '24h' }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewStack, setViewStack] = useState<TreemapData[]>([data]);

  const currentView = viewStack[viewStack.length - 1];

  useEffect(() => {
    setViewStack([data]);
  }, [data]);

  const drillDown = useCallback((node: TreemapData) => {
    if (node.children && node.children.length > 0) {
      setViewStack(prev => [...prev, node]);
    }
  }, []);

  const goBack = useCallback((index: number) => {
    setViewStack(prev => prev.slice(0, index + 1));
  }, []);

  const getCategoryName = useCallback((d: d3.HierarchyRectangularNode<TreemapData>): string => {
    let node: d3.HierarchyRectangularNode<TreemapData> | null = d;
    while (node && node.depth > 1) {
      node = node.parent;
    }
    return node?.data?.name || d.data?.category || '';
  }, []);

  useEffect(() => {
    if (!svgRef.current || !currentView || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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

    // Sort: draw parents first, then leaves on top
    const parentNodes = nodes.filter(d => d.depth > 0 && d.children);
    const leafNodes = nodes.filter(d => d.depth > 0 && !d.children);

    // --- PARENT NODES (category/subcategory frames) ---
    const parentGroups = svg.selectAll<SVGGElement, RectNode>('g.parent')
      .data(parentNodes)
      .enter()
      .append('g')
      .attr('class', 'parent');

    // Frame background rectangle
    parentGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const cat = getCategoryName(d);
        return CATEGORY_FRAME[cat] || CATEGORY_FRAME['Other'];
      })
      .attr('stroke', d => d.depth === 1 ? '#222' : '#999')
      .attr('stroke-width', d => d.depth === 1 ? 2 : 1)
      .attr('cursor', 'pointer')
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        drillDown(d.data);
      });

    // Header bar background (the colored strip at top)
    parentGroups.append('rect')
      .attr('x', d => d.x0 + (d.depth === 1 ? 1 : 0.5))
      .attr('y', d => d.y0 + (d.depth === 1 ? 1 : 0.5))
      .attr('width', d => Math.max(0, d.x1 - d.x0 - (d.depth === 1 ? 2 : 1)))
      .attr('height', 22)
      .attr('fill', d => {
        const cat = getCategoryName(d);
        return CATEGORY_HEADER[cat] || CATEGORY_HEADER['Other'];
      })
      .attr('pointer-events', 'none');

    // Header text
    parentGroups.append('text')
      .attr('x', d => d.x0 + 6)
      .attr('y', d => d.y0 + 16)
      .attr('fill', '#111')
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

    // Volume text (right-aligned in header, for depth-1 categories)
    parentGroups.filter(d => d.depth === 1)
      .append('text')
      .attr('x', d => d.x1 - 6)
      .attr('y', d => d.y0 + 16)
      .attr('fill', '#555')
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
        // Only show right-aligned volume if the full string didn't fit in the left text
        if (full.length <= maxChars) return '';
        if (w < 80) return '';
        return vol;
      });

    // --- LEAF NODES (white boxes) ---
    const leafGroups = svg.selectAll<SVGGElement, RectNode>('g.leaf')
      .data(leafNodes)
      .enter()
      .append('g')
      .attr('class', 'leaf');

    // Color-coded leaf rectangle
    leafGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const cat = getCategoryName(d);
        return CATEGORY_LEAF[cat] || CATEGORY_LEAF['Other'];
      })
      .attr('stroke', '#bbb')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d) {
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);

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
        d3.select(this).attr('stroke', '#bbb').attr('stroke-width', 1);
        setTooltip(null);
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        const nodeData = d.data as any;
        if (nodeData?.market && onMarketClick) {
          onMarketClick(nodeData.market);
        } else if (d.children && d.children.length > 0) {
          drillDown(d.data);
        }
      });

    // Leaf labels
    leafGroups.each(function(d) {
      const g = d3.select(this);
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;

      if (w < 35 || h < 20) return;

      const name = d.data?.name || '';
      const maxChars = Math.floor(w / 7);
      const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;

      g.append('text')
        .attr('x', d.x0 + 5)
        .attr('y', d.y0 + 15)
        .attr('fill', '#222')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('pointer-events', 'none')
        .text(displayName);

      if (h >= 32 && w >= 50) {
        g.append('text')
          .attr('x', d.x0 + 5)
          .attr('y', d.y0 + 28)
          .attr('fill', '#888')
          .attr('font-size', '10px')
          .attr('font-weight', '400')
          .attr('pointer-events', 'none')
          .text(formatVolume(d.value || 0));
      }
    });

    // Outer border
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', '#222')
      .attr('stroke-width', 2);

  }, [currentView, width, height, onMarketClick, totalVolume, getCategoryName, drillDown]);

  return (
    <div className="relative">
      {/* Breadcrumb header */}
      <div className="bg-white border-2 border-gray-800 border-b-0 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          {viewStack.map((view, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="text-gray-400 mx-1">/</span>}
              <button
                onClick={() => goBack(index)}
                className={`hover:underline ${
                  index === viewStack.length - 1
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {view.name || 'All Markets'}
              </button>
            </span>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          {timeframeLabel} Volume{' '}
          <span className="font-bold text-gray-900">{formatVolume(totalVolume)}</span>
        </div>
      </div>

      {/* Treemap SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white block"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
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
