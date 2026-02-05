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

// Light pastel colors for categories
const CATEGORY_COLORS: Record<string, string> = {
  'Politics': '#c8e6c9',      // light green
  'Sports': '#bbdefb',        // light blue
  'Crypto': '#fff9c4',        // light yellow
  'Economics': '#f0f4c3',     // light lime
  'Tech': '#e1bee7',          // light purple
  'Entertainment': '#ffccbc', // light orange
  'World': '#b2dfdb',         // light teal
  'Other': '#e0e0e0',         // light gray
};

export default function Treemap({ data, width, height, onMarketClick, totalVolume }: TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!containerRef.current || !currentView || width === 0 || height === 0) return;

    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#ffffff')
      .style('font-family', "'Inter', -apple-system, BlinkMacSystemFont, sans-serif");

    if (!currentView.children || currentView.children.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .attr('font-size', '14px')
        .text('No data');
      return;
    }

    const root = d3.hierarchy(currentView)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreemapData>()
      .size([width, height])
      .padding(1)
      .paddingTop(24)
      .paddingInner(1)
      .round(true)(root);

    const getColor = (d: any): string => {
      const name = d.data?.name || '';
      if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
      if (d.parent?.data?.name && CATEGORY_COLORS[d.parent.data.name]) {
        return CATEGORY_COLORS[d.parent.data.name];
      }
      if (d.data?.category && CATEGORY_COLORS[d.data.category]) {
        return CATEGORY_COLORS[d.data.category];
      }
      return '#f5f5f5';
    };

    const renderNode = (selection: any, nodes: any[], level: number, parentValue?: number) => {
      const groups = selection.selectAll(`g.level-${level}`)
        .data(nodes)
        .join('g')
        .attr('class', `level-${level}`);

      groups.append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
        .attr('fill', (d: any) => {
          const color = getColor(d);
          return d3.color(color)?.brighter(level * 0.15)?.toString() || color;
        })
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
        .attr('cursor', (d: any) => (d.children || d.data?.market || d.data?.isOthers) ? 'pointer' : 'default')
        .on('mouseenter', function(this: SVGRectElement, event: any, d: any) {
          d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);

          const percentTotal = totalVolume > 0 ? ((d.value || 0) / totalVolume) * 100 : 0;
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
        .on('mousemove', (event: any) => {
          setTooltip(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
        })
        .on('mouseleave', function(this: SVGRectElement) {
          d3.select(this).attr('stroke', '#e0e0e0').attr('stroke-width', 1);
          setTooltip(null);
        })
        .on('click', (event: any, d: any) => {
          event.stopPropagation();

          if (d.data?.market && onMarketClick) {
            onMarketClick(d.data.market);
          } else if (d.data?.isOthers && d.data?.hiddenMarkets) {
            const expanded: TreemapData = {
              name: d.data.name,
              children: d.data.hiddenMarkets.map((m: Market) => ({
                name: m.title,
                value: m.volume,
                market: m,
                category: m.category,
              })),
            };
            drillDown(expanded);
          } else if (d.children && d.children.length > 0) {
            drillDown(d.data);
          }
        });

      // Labels
      groups.each(function(this: SVGGElement, d: any) {
        const g = d3.select(this);
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;

        if (rectWidth > 30 && rectHeight > 20) {
          const isLeaf = !d.children || d.children.length === 0;
          const name = d.data?.name || '';
          const maxChars = Math.floor(rectWidth / 7);
          const displayName = name.length > maxChars ? name.slice(0, maxChars - 2) + '...' : name;

          // Category/subcategory header with volume
          if (!isLeaf && rectWidth > 50) {
            const volText = formatVolume(d.value || 0);
            g.append('text')
              .attr('x', d.x0 + 6)
              .attr('y', d.y0 + 16)
              .attr('fill', '#333')
              .attr('font-size', '12px')
              .attr('font-weight', '500')
              .attr('pointer-events', 'none')
              .text(`${displayName} ${volText}`);
          } else {
            // Leaf node label
            g.append('text')
              .attr('x', d.x0 + 4)
              .attr('y', d.y0 + 14)
              .attr('fill', '#333')
              .attr('font-size', '11px')
              .attr('font-weight', '400')
              .attr('pointer-events', 'none')
              .text(displayName);

            // Volume on second line for larger cells
            if (rectHeight > 35 && rectWidth > 45) {
              g.append('text')
                .attr('x', d.x0 + 4)
                .attr('y', d.y0 + 26)
                .attr('fill', '#666')
                .attr('font-size', '10px')
                .attr('pointer-events', 'none')
                .text(formatVolume(d.value || 0));
            }
          }
        }

        if (d.children && d.children.length > 0) {
          renderNode(g, d.children, level + 1, d.value);
        }
      });
    };

    if (root.children) {
      renderNode(svg, root.children, 0, root.value);
    }

  }, [currentView, width, height, onMarketClick, drillDown, totalVolume]);

  return (
    <div className="relative">
      {/* Header */}
      <div className="bg-white border border-gray-200 px-4 py-2 mb-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {viewStack.map((view, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="text-gray-400 mx-2">/</span>}
              <button
                onClick={() => goBack(index)}
                className={`hover:underline ${
                  index === viewStack.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {view.name || 'All Markets'}
              </button>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          Total Volume <span className="font-semibold text-gray-900">{formatVolume(totalVolume)}</span>
        </div>
      </div>

      {/* Treemap */}
      <div ref={containerRef} className="border border-t-0 border-gray-200" style={{ width, height }} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded px-4 py-3 shadow-xl pointer-events-none min-w-[200px]"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 240),
            top: Math.min(tooltip.y + 12, window.innerHeight - 140),
          }}
        >
          <div className="font-semibold text-base mb-2">{tooltip.title}</div>
          <div className="text-green-400 text-xl font-bold mb-2">
            {formatVolume(tooltip.volume)}
          </div>
          <div className="text-gray-300 text-sm space-y-1">
            <div className="flex justify-between">
              <span>{tooltip.percentTotal.toFixed(1)}%</span>
              <span className="text-gray-500">of Total</span>
            </div>
            {tooltip.percentParent !== undefined && tooltip.parentName && (
              <div className="flex justify-between">
                <span>{tooltip.percentParent.toFixed(1)}%</span>
                <span className="text-gray-500">of {tooltip.parentName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
