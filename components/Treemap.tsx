'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { TreemapData, Market } from '@/lib/types';
import { formatVolume, CATEGORY_COLORS } from '@/lib/utils';

interface TreemapProps {
  data: TreemapData;
  width: number;
  height: number;
  onMarketClick?: (market: Market) => void;
}

interface TooltipData {
  title: string;
  volume: number;
  subtitle?: string;
  clickable?: boolean;
  market?: Market;
  x: number;
  y: number;
}

export default function Treemap({ data, width, height, onMarketClick }: TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewStack, setViewStack] = useState<TreemapData[]>([data]);

  const currentView = viewStack[viewStack.length - 1];

  // Reset when data changes
  useEffect(() => {
    setViewStack([data]);
  }, [data]);

  // Drill down
  const drillDown = useCallback((node: TreemapData) => {
    if (node.children && node.children.length > 0) {
      setViewStack(prev => [...prev, node]);
    }
  }, []);

  // Go back
  const goBack = useCallback((index: number) => {
    setViewStack(prev => prev.slice(0, index + 1));
  }, []);

  // Get depth of current view
  const depth = viewStack.length - 1;

  useEffect(() => {
    if (!containerRef.current || !currentView || width === 0 || height === 0) return;

    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#1a1a2e')
      .style('border-radius', '8px');

    if (!currentView.children || currentView.children.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .text('No data');
      return;
    }

    // Create root hierarchy
    const root = d3.hierarchy(currentView)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap
    d3.treemap<TreemapData>()
      .size([width, height])
      .padding(1)
      .paddingTop(22)
      .paddingInner(1)
      .round(true)(root);

    // Get color for node
    const getColor = (d: any): string => {
      const name = d.data?.name || '';
      if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
      if (d.parent?.data?.name && CATEGORY_COLORS[d.parent.data.name]) {
        return CATEGORY_COLORS[d.parent.data.name];
      }
      if (d.data?.category && CATEGORY_COLORS[d.data.category]) {
        return CATEGORY_COLORS[d.data.category];
      }
      return '#666';
    };

    // Render recursively
    const renderNode = (selection: any, nodes: any[], level: number) => {
      const groups = selection.selectAll(`g.level-${level}`)
        .data(nodes)
        .join('g')
        .attr('class', `level-${level}`);

      // Background rect for each node
      groups.append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
        .attr('fill', (d: any) => {
          const color = getColor(d);
          // Lighten based on depth
          return d3.color(color)?.brighter(level * 0.3)?.toString() || color;
        })
        .attr('stroke', '#1a1a2e')
        .attr('stroke-width', 1)
        .attr('rx', 2)
        .attr('cursor', (d: any) => (d.children || d.data?.market || d.data?.isOthers) ? 'pointer' : 'default')
        .on('mouseenter', function(this: SVGRectElement, event: any, d: any) {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);

          const isOthers = d.data?.isOthers;
          const hasChildren = d.children && d.children.length > 0;
          const market = d.data?.market;

          setTooltip({
            title: d.data?.name || '',
            volume: d.value || 0,
            subtitle: market ? `Platform: ${market.platform}` : hasChildren ? `${d.children.length} items` : isOthers ? 'Click to expand' : undefined,
            clickable: hasChildren || isOthers,
            market,
            x: event.pageX,
            y: event.pageY,
          });
        })
        .on('mousemove', (event: any) => {
          setTooltip(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
        })
        .on('mouseleave', function(this: SVGRectElement) {
          d3.select(this).attr('stroke', '#1a1a2e').attr('stroke-width', 1);
          setTooltip(null);
        })
        .on('click', (event: any, d: any) => {
          event.stopPropagation();

          if (d.data?.market && onMarketClick) {
            onMarketClick(d.data.market);
          } else if (d.data?.isOthers && d.data?.hiddenMarkets) {
            // Expand hidden markets
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

      // Label for each node
      groups.each(function(d: any) {
        const g = d3.select(this);
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;

        // Header label
        if (rectWidth > 40 && rectHeight > 20) {
          const isLeaf = !d.children || d.children.length === 0;
          const name = d.data?.name || '';
          const displayName = name.length > rectWidth / 7 ? name.slice(0, Math.floor(rectWidth / 7) - 2) + '..' : name;

          g.append('text')
            .attr('x', d.x0 + 4)
            .attr('y', d.y0 + 14)
            .attr('fill', '#fff')
            .attr('font-size', isLeaf ? '10px' : '11px')
            .attr('font-weight', isLeaf ? '400' : '600')
            .attr('pointer-events', 'none')
            .text(displayName);

          // Volume for non-leaf nodes or larger leaf nodes
          if ((!isLeaf && rectWidth > 60) || (isLeaf && rectHeight > 40 && rectWidth > 50)) {
            const volY = isLeaf ? d.y0 + 28 : d.y0 + 14;
            const volText = formatVolume(d.value || 0);

            if (!isLeaf) {
              // Show volume after name for categories
              g.append('text')
                .attr('x', d.x0 + 4 + displayName.length * 6.5)
                .attr('y', d.y0 + 14)
                .attr('fill', '#ccc')
                .attr('font-size', '10px')
                .attr('pointer-events', 'none')
                .text(` ${volText}`);
            } else if (rectHeight > 40) {
              g.append('text')
                .attr('x', d.x0 + 4)
                .attr('y', volY)
                .attr('fill', '#aaa')
                .attr('font-size', '9px')
                .attr('pointer-events', 'none')
                .text(volText);
            }
          }
        }

        // Recursively render children
        if (d.children && d.children.length > 0) {
          renderNode(g, d.children, level + 1);
        }
      });
    };

    // Start rendering from root children
    if (root.children) {
      renderNode(svg, root.children, 0);
    }

  }, [currentView, width, height, onMarketClick, drillDown]);

  return (
    <div className="relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3 text-sm flex-wrap">
        {viewStack.map((view, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="text-gray-500 mx-1">›</span>}
            <button
              onClick={() => goBack(index)}
              className={`px-2 py-1 rounded transition-all ${
                index === viewStack.length - 1
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {view.name || 'Markets'}
            </button>
          </div>
        ))}
      </div>

      {/* Treemap */}
      <div ref={containerRef} style={{ width, height }} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-2xl pointer-events-none max-w-xs"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 280),
            top: Math.min(tooltip.y + 12, window.innerHeight - 120),
          }}
        >
          <div className="font-semibold text-white text-sm mb-1">{tooltip.title}</div>
          <div className="text-green-400 font-medium text-sm">{formatVolume(tooltip.volume)}</div>
          {tooltip.subtitle && (
            <div className="text-gray-400 text-xs mt-1">{tooltip.subtitle}</div>
          )}
          {tooltip.clickable && (
            <div className="text-blue-400 text-xs mt-2 pt-1 border-t border-gray-700">
              Click to drill down →
            </div>
          )}
          {tooltip.market && (
            <div className="text-blue-400 text-xs mt-2 pt-1 border-t border-gray-700">
              Click to open on {tooltip.market.platform} →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
