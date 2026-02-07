'use client';

import { useState, useCallback } from 'react';
import { DrawingToolType, DrawingPoint, Drawing, TOOL_POINT_COUNT, DRAWING_COLORS } from './drawing-types';

interface DrawingToolState {
  activeTool: DrawingToolType | null;
  pendingPoints: DrawingPoint[];
  previewPoint: DrawingPoint | null;
  selectedColor: string;
  selectedDrawingId: string | null;
}

export function useDrawingTool(
  coinId: string,
  interval: string,
  onDrawingComplete: (drawing: Drawing) => void,
) {
  const [state, setState] = useState<DrawingToolState>({
    activeTool: null,
    pendingPoints: [],
    previewPoint: null,
    selectedColor: DRAWING_COLORS[0],
    selectedDrawingId: null,
  });

  const setActiveTool = useCallback((tool: DrawingToolType | null) => {
    setState(prev => ({
      ...prev,
      activeTool: tool,
      pendingPoints: [],
      previewPoint: null,
      selectedDrawingId: tool ? null : prev.selectedDrawingId,
    }));
  }, []);

  const setPreviewPoint = useCallback((point: DrawingPoint | null) => {
    setState(prev => ({ ...prev, previewPoint: point }));
  }, []);

  const setSelectedColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, selectedColor: color }));
  }, []);

  const setSelectedDrawingId = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedDrawingId: id,
      activeTool: id ? null : prev.activeTool,
      pendingPoints: id ? [] : prev.pendingPoints,
    }));
  }, []);

  const addPoint = useCallback((point: DrawingPoint) => {
    setState(prev => {
      if (!prev.activeTool) return prev;

      const newPoints = [...prev.pendingPoints, point];
      const needed = TOOL_POINT_COUNT[prev.activeTool];

      if (newPoints.length >= needed) {
        // Drawing complete
        const drawing: Drawing = {
          id: crypto.randomUUID(),
          toolType: prev.activeTool,
          points: newPoints.slice(0, needed),
          color: prev.selectedColor,
          coinId,
          interval,
          createdAt: Date.now(),
        };
        onDrawingComplete(drawing);
        return {
          ...prev,
          pendingPoints: [],
          previewPoint: null,
          // Keep tool active for quick successive drawings
        };
      }

      return { ...prev, pendingPoints: newPoints };
    });
  }, [coinId, interval, onDrawingComplete]);

  const cancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeTool: null,
      pendingPoints: [],
      previewPoint: null,
    }));
  }, []);

  return {
    activeTool: state.activeTool,
    pendingPoints: state.pendingPoints,
    previewPoint: state.previewPoint,
    selectedColor: state.selectedColor,
    selectedDrawingId: state.selectedDrawingId,
    setActiveTool,
    setPreviewPoint,
    setSelectedColor,
    setSelectedDrawingId,
    addPoint,
    cancel,
  };
}
