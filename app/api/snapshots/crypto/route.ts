import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get('coinId') || 'bitcoin';
  const days = Math.min(parseInt(searchParams.get('days') || '30') || 30, 365);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.cryptoSnapshot.findMany({
    where: {
      coinId,
      snapshotAt: { gte: since },
    },
    orderBy: { snapshotAt: 'asc' },
    select: {
      price: true,
      marketCap: true,
      change24h: true,
      volume24h: true,
      snapshotAt: true,
    },
  });

  return NextResponse.json(
    { coinId, days, snapshots },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
