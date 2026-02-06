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

// Leaf node fills — clearly visible soft pastels
const CATEGORY_FILLS: Record<string, string> = {
  'Politics': '#b8ddb9',
  'Sports': '#a8d4f0',
  'Crypto': '#f0b8c8',
  'Economics': '#c8dea0',
  'Tech': '#d4b8e8',
  'Entertainment': '#f8d0a0',
  'World': '#a0d8d0',
  'Other': '#d0c0e8',
};

// Parent node fills — lighter version of same hue
const CATEGORY_BG: Record<string, string> = {
  'Politics': '#d8eeda',
  'Sports': '#c8e4f4',
  'Crypto': '#f4d4de',
  'Economics': '#dceac0',
  'Tech': '#e4d4f0',
  'Entertainment': '#fce4c4',
  'World': '#c0e8e2',
  'Other': '#e0d4f0',
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
    return node?.data?.name || '';
  }, []);

  const getTint = useCallback((d: d3.HierarchyRectangularNode<TreemapData>): string => {
    const category = getCategoryName(d);

    // Also check the data's own category field (for drilled-down views)
    const cat = category || d.data?.category || '';

    if (!d.children) {
      return CATEGORY_FILLS[cat] || CATEGORY_FILLS['Other'];
    }
    return CATEGORY_BG[cat] || CATEGORY_BG['Other'];
  }, [getCategoryName]);

  useEffect(() => {
    if (!svgRef.current || !currentView || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const root = d3.hierarchy(currentView)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreemapData>()
      .size([width, height])
      .paddingTop(22)
      .paddingRight(1)
      .paddingBottom(1)
      .paddingLeft(1)
      .paddingInner(1)
      .round(true)(root);

    type RectNode = d3.HierarchyRectangularNode<TreemapData>;
    const nodes = root.descendants() as RectNode[];

    // Draw all nodes
    const groups = svg.selectAll<SVGGElement, RectNode>('g.node')
      .data(nodes.filter(d => d.depth > 0))
      .enter()
      .append('g')
      .attr('class', 'node');

    // Rectangles
    groups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => getTint(d))
      .attr('stroke', d => d.depth === 1 ? '#333' : '#bbb')
      .attr('stroke-width', d => d.depth === 1 ? 1.5 : 0.5)
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
      .on('mouseleave', function(_, d) {
        d3.select(this)
          .attr('stroke', d.depth === 1 ? '#333' : '#bbb')
          .attr('stroke-width', d.depth === 1 ? 1.5 : 0.5);
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

    // Header labels for nodes with children
    groups.filter(d => !!d.children)
      .append('text')
      .attr('x', d => d.x0 + 4)
      .attr('y', d => d.y0 + 15)
      .attr('fill', '#111')
      .attr('font-size', d => d.depth === 1 ? '13px' : '11px')
      .attr('font-weight', d => d.depth === 1 ? '600' : '500')
      .attr('pointer-events', 'none')
      .text(d => {
        const w = d.x1 - d.x0;
        if (w < 30) return '';
        const name = d.data?.name || '';
        const vol = formatVolume(d.value || 0);
        const full = `${name} ${vol}`;
        const maxChars = Math.floor(w / 7.5);
        if (full.length <= maxChars) return full;
        if (name.length > maxChars - 1) return name.slice(0, maxChars - 2) + '…';
        return name;
      });

    // Leaf node labels
    groups.filter(d => !d.children)
      .each(function(d) {
        const g = d3.select(this);
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;

        if (w < 30 || h < 18) return;

        const name = d.data?.name || '';
        const maxChars = Math.floor(w / 6.5);
        const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;

        g.append('text')
          .attr('x', d.x0 + 4)
          .attr('y', d.y0 + 14)
          .attr('fill', '#333')
          .attr('font-size', '11px')
          .attr('font-weight', '400')
          .attr('pointer-events', 'none')
          .text(displayName);

        if (h >= 30 && w >= 45) {
          g.append('text')
            .attr('x', d.x0 + 4)
            .attr('y', d.y0 + 26)
            .attr('fill', '#666')
            .attr('font-size', '10px')
            .attr('pointer-events', 'none')
            .text(formatVolume(d.value || 0));
        }
      });

    // Root border
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

  }, [currentView, width, height, onMarketClick, totalVolume, getTint, drillDown]);

  return (
    <div className="relative">
      {/* Breadcrumb header */}
      <div className="bg-white border border-gray-300 border-b-0 px-4 py-2 flex items-center justify-between">
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
