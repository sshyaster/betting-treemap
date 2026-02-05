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

export default function Treemap({ data, width, height, onMarketClick, totalVolume }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewStack, setViewStack] = useState<TreemapData[]>([data]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentView = viewStack[viewStack.length - 1];

  useEffect(() => {
    setViewStack([data]);
  }, [data]);

  const drillDown = useCallback((node: TreemapData) => {
    if (node.children && node.children.length > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setViewStack(prev => [...prev, node]);
    }
  }, [isTransitioning]);

  const goBack = useCallback((index: number) => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setViewStack(prev => prev.slice(0, index + 1));
    }
  }, [isTransitioning]);

  const getColor = useCallback((d: any): string => {
    const name = d.data?.name || '';
    if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    if (d.parent?.data?.name && CATEGORY_COLORS[d.parent.data.name]) {
      return CATEGORY_COLORS[d.parent.data.name];
    }
    if (d.data?.category && CATEGORY_COLORS[d.data.category]) {
      return CATEGORY_COLORS[d.data.category];
    }
    return '#f5f5f5';
  }, []);

  useEffect(() => {
    if (!svgRef.current || !currentView || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);

    // Create root hierarchy
    const root = d3.hierarchy(currentView)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    d3.treemap<TreemapData>()
      .size([width, height])
      .padding(2)
      .paddingTop(26)
      .paddingInner(2)
      .round(true)(root);

    const nodes = root.descendants();
    const t = svg.transition().duration(750).ease(d3.easeCubicInOut);

    // Bind data with key function
    const groups = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<TreemapData>>('g.node')
      .data(nodes, d => d.data.name + '-' + d.depth);

    // Exit old nodes
    groups.exit()
      .transition(t as any)
      .style('opacity', 0)
      .remove();

    // Enter new nodes
    const enterGroups = groups.enter()
      .append('g')
      .attr('class', 'node')
      .style('opacity', 0);

    // Add rectangles to entering groups
    enterGroups.append('rect')
      .attr('class', 'node-rect');

    // Add text labels
    enterGroups.append('text')
      .attr('class', 'node-label');

    enterGroups.append('text')
      .attr('class', 'node-volume');

    // Merge enter + update
    const allGroups = enterGroups.merge(groups);

    // Transition opacity for entering nodes
    allGroups.transition(t as any)
      .style('opacity', 1)
      .on('end', () => setIsTransitioning(false));

    // Update rectangles with transition
    allGroups.select<SVGRectElement>('rect.node-rect')
      .attr('cursor', d => (d.children || d.data?.market || (d.data as any)?.isOthers) ? 'pointer' : 'default')
      .on('mouseenter', function(event: MouseEvent, d) {
        if (d.depth === 0) return; // Skip root
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);

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
        if (d.depth === 0) return;
        d3.select(this).attr('stroke', '#e0e0e0').attr('stroke-width', 1);
        setTooltip(null);
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        if (d.depth === 0) return;

        const nodeData = d.data as any;
        if (nodeData?.market && onMarketClick) {
          onMarketClick(nodeData.market);
        } else if (nodeData?.isOthers && nodeData?.hiddenMarkets) {
          const expanded: TreemapData = {
            name: nodeData.name,
            children: nodeData.hiddenMarkets.map((m: Market) => ({
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
      })
      .transition(t as any)
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => {
        if (d.depth === 0) return '#ffffff';
        const color = getColor(d);
        return d3.color(color)?.brighter((d.depth - 1) * 0.2)?.toString() || color;
      })
      .attr('stroke', (d: any) => d.depth === 0 ? 'none' : '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('rx', 2);

    // Update labels with transition
    allGroups.select<SVGTextElement>('text.node-label')
      .transition(t as any)
      .attr('x', (d: any) => d.x0 + 6)
      .attr('y', (d: any) => d.y0 + 17)
      .attr('fill', '#333')
      .attr('font-size', (d: any) => d.children ? '12px' : '11px')
      .attr('font-weight', (d: any) => d.children ? '500' : '400')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        if (d.depth === 0) return '';
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        if (rectWidth < 35 || rectHeight < 22) return '';

        const name = d.data?.name || '';
        const maxChars = Math.floor(rectWidth / 7);
        let displayName = name.length > maxChars ? name.slice(0, maxChars - 2) + '...' : name;

        // Add volume for parent nodes
        if (d.children && rectWidth > 80) {
          displayName += ' ' + formatVolume(d.value || 0);
        }
        return displayName;
      });

    // Volume text for leaf nodes
    allGroups.select<SVGTextElement>('text.node-volume')
      .transition(t as any)
      .attr('x', (d: any) => d.x0 + 6)
      .attr('y', (d: any) => d.y0 + 30)
      .attr('fill', '#666')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        if (d.depth === 0 || d.children) return '';
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        if (rectWidth < 50 || rectHeight < 38) return '';
        return formatVolume(d.value || 0);
      });

  }, [currentView, width, height, onMarketClick, drillDown, totalVolume, getColor]);

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
                disabled={isTransitioning}
                className={`hover:underline transition-colors ${
                  index === viewStack.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isTransitioning ? 'cursor-wait' : ''}`}
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

      {/* Treemap SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-t-0 border-gray-200 bg-white"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-4 py-3 shadow-xl pointer-events-none min-w-[200px] transition-opacity duration-150"
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
