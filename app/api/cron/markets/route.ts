import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/cron-auth';
import { fetchAllMarkets } from '@/lib/api';
import { fetchKalshiMarkets } from '@/lib/kalshi-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Idempotency check — skip if snapshots exist for today
    const existingCount = await prisma.marketSnapshot.count({
      where: { snapshotAt: dayStart },
    });

    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Snapshots already exist for today',
        count: existingCount,
      });
    }

    // Fetch from both platforms in parallel
    const [polymarkets, kalshiMarkets] = await Promise.all([
      fetchAllMarkets(),
      fetchKalshiMarkets(),
    ]);

    // Top 50 per platform to keep storage manageable
    const topPoly = polymarkets.slice(0, 50);
    const topKalshi = kalshiMarkets.slice(0, 50);
    const allMarkets = [...topPoly, ...topKalshi];

    await prisma.marketSnapshot.createMany({
      data: allMarkets.map(m => ({
        marketId: m.id,
        title: m.title,
        platform: m.platform,
        category: m.category,
        volume24hr: m.volume24hr,
        volume1wk: m.volume1wk,
        volume1mo: m.volume1mo,
        volumeAll: m.volumeAll,
        openInterest: m.openInterest,
        price: m.price ?? null,
        snapshotAt: dayStart,
      })),
    });

    return NextResponse.json({
      success: true,
      count: allMarkets.length,
      polymarket: topPoly.length,
      kalshi: topKalshi.length,
      snapshotAt: dayStart.toISOString(),
    });
  } catch (error) {
    console.error('Market snapshot error:', error);
    return NextResponse.json({ error: 'Failed to create market snapshots' }, { status: 500 });
  }
}
