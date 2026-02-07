import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') || 'polymarket';
  const days = Math.min(parseInt(searchParams.get('days') || '30') || 30, 365);
  const marketId = searchParams.get('marketId');
  const category = searchParams.get('category');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    platform,
    snapshotAt: { gte: since },
  };
  if (marketId) where.marketId = marketId;
  if (category) where.category = category;

  const snapshots = await prisma.marketSnapshot.findMany({
    where,
    orderBy: { snapshotAt: 'asc' },
    select: {
      marketId: true,
      title: true,
      category: true,
      volume24hr: true,
      openInterest: true,
      price: true,
      snapshotAt: true,
    },
  });

  return NextResponse.json(
    { platform, days, count: snapshots.length, snapshots },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
