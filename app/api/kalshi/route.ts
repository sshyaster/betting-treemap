import { NextResponse } from 'next/server';
import { fetchKalshiMarkets } from '@/lib/kalshi-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const markets = await fetchKalshiMarkets();

    const totalVolume = markets.reduce((sum, m) => sum + m.volume24hr, 0);

    return NextResponse.json({
      markets,
      totalVolume,
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });
  } catch (error) {
    console.error('Kalshi API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Kalshi data' },
      { status: 500 }
    );
  }
}
