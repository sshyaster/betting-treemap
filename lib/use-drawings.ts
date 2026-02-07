'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Drawing, DrawingAction } from './drawing-types';

const STORAGE_KEY = 'chart-drawings';

function drawingsReducer(state: Drawing[], action: DrawingAction): Drawing[] {
  switch (action.type) {
    case 'ADD_DRAWING':
      return [...state, action.drawing];
    case 'DELETE_DRAWING':
      return state.filter(d => d.id !== action.id);
    case 'SET_DRAWINGS':
      return action.drawings;
    case 'CLEAR_DRAWINGS':
      return state.filter(d => !(d.coinId === action.coinId && d.interval === action.interval));
    default:
      return state;
  }
}

function loadFromStorage(): Drawing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(drawings: Drawing[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
  } catch {}
}

export function useDrawings(coinId: string, interval: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [allDrawings, dispatch] = useReducer(drawingsReducer, [], loadFromStorage);
  const fetchedRef = useRef<string>('');

  // Fetch from API when authenticated + coin/interval changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const key = `${coinId}:${interval}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    fetch(`/api/drawings?coinId=${encodeURIComponent(coinId)}&interval=${encodeURIComponent(interval)}`)
      .then(r => r.ok ? r.json() : [])
      .then((dbDrawings: Array<{ id: string; toolType: string; points: unknown; color: string; coinId: string; interval: string; createdAt: string }>) => {
        // Merge API drawings with any local ones for this coin/interval
        const localOther = allDrawings.filter(d => !(d.coinId === coinId && d.interval === interval));
        const mapped: Drawing[] = dbDrawings.map(d => ({
          id: d.id,
          toolType: d.toolType as Drawing['toolType'],
          points: d.points as Drawing['points'],
          color: d.color,
          coinId: d.coinId,
          interval: d.interval,
          createdAt: new Date(d.createdAt).getTime(),
        }));
        dispatch({ type: 'SET_DRAWINGS', drawings: [...localOther, ...mapped] });
      })
      .catch(() => {});
  }, [isAuthenticated, coinId, interval]);

  // Persist to localStorage when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      saveToStorage(allDrawings);
    }
  }, [allDrawings, isAuthenticated]);

  // Filtered drawings for current coin + interval
  const drawings = allDrawings.filter(d => d.coinId === coinId && d.interval === interval);

  const addDrawing = useCallback((drawing: Drawing) => {
    dispatch({ type: 'ADD_DRAWING', drawing });

    // Persist to API if authenticated
    if (isAuthenticated) {
      fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinId: drawing.coinId,
          interval: drawing.interval,
          toolType: drawing.toolType,
          points: drawing.points,
          color: drawing.color,
        }),
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const deleteDrawing = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DRAWING', id });

    if (isAuthenticated) {
      fetch(`/api/drawings/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [isAuthenticated]);

  const clearDrawings = useCallback(() => {
    // Delete all from API for this coin/interval
    if (isAuthenticated) {
      const toDelete = allDrawings.filter(d => d.coinId === coinId && d.interval === interval);
      for (const d of toDelete) {
        fetch(`/api/drawings/${d.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    dispatch({ type: 'CLEAR_DRAWINGS', coinId, interval });
  }, [coinId, interval, isAuthenticated, allDrawings]);

  const setDrawings = useCallback((drawings: Drawing[]) => {
    dispatch({ type: 'SET_DRAWINGS', drawings });
  }, []);

  return { drawings, allDrawings, addDrawing, deleteDrawing, clearDrawings, setDrawings };
}
