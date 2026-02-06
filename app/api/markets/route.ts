import { NextRequest, NextResponse } from 'next/server';
import { fetchAllMarkets } from '@/lib/api';

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Log cron invocations
    const isCron = request.headers.get('x-vercel-cron') === '1';
    if (isCron) {
      console.log('Cron job: refreshing market data');
    }

    const markets = await fetchAllMarkets();

    const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);

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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
