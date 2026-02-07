import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Query archived OHLC candle data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get('coinId') || 'bitcoin';
  const days = Math.min(parseInt(searchParams.get('days') || '90') || 90, 365);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const candles = await prisma.cryptoOHLC.findMany({
    where: {
      coinId,
      date: { gte: since },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      open: true,
      high: true,
      low: true,
      close: true,
      volume: true,
    },
  });

  return NextResponse.json(
    { coinId, days, count: candles.length, candles },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
