import { DrawingPoint } from './drawing-types';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Convert pixel coordinates to data-space coordinates (price + time).
 */
export function pixelToData(
  px: { x: number; y: number },
  visibleCandles: Candle[],
  marginLeft: number,
  chartW: number,
  marginTop: number,
  chartH: number,
  volH: number,
  priceMin: number,
  priceMax: number,
): DrawingPoint | null {
  if (visibleCandles.length === 0 || chartW <= 0) return null;

  // X -> time: find fractional candle index, interpolate timestamp
  const mx = px.x - marginLeft;
  const frac = mx / chartW;
  const fracIdx = frac * (visibleCandles.length - 1);
  const idx = Math.max(0, Math.min(visibleCandles.length - 1, Math.round(fracIdx)));
  const time = visibleCandles[idx].time;

  // Y -> price: reverse yScale
  const priceH = chartH - volH;
  const ratio = 1 - (px.y - marginTop) / priceH;
  const price = priceMin + ratio * (priceMax - priceMin);

  return { price, time };
}

/**
 * Find the pixel X position for a given timestamp among visible candles.
 * Returns null if the timestamp is outside the visible range.
 */
export function timeToPixelX(
  time: number,
  visibleCandles: Candle[],
  xScale: (i: number) => number,
): number | null {
  if (visibleCandles.length === 0) return null;

  // Binary search for closest candle
  let lo = 0;
  let hi = visibleCandles.length - 1;

  if (time <= visibleCandles[lo].time) return xScale(lo);
  if (time >= visibleCandles[hi].time) return xScale(hi);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (visibleCandles[mid].time === time) return xScale(mid);
    if (visibleCandles[mid].time < time) lo = mid + 1;
    else hi = mid - 1;
  }

  // Interpolate between lo-1 and lo
  const i1 = Math.max(0, lo - 1);
  const i2 = Math.min(visibleCandles.length - 1, lo);
  if (i1 === i2) return xScale(i1);

  const t1 = visibleCandles[i1].time;
  const t2 = visibleCandles[i2].time;
  const ratio = (time - t1) / (t2 - t1);
  const x1 = xScale(i1);
  const x2 = xScale(i2);
  return x1 + ratio * (x2 - x1);
}
