import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINS = ['bitcoin', 'ethereum', 'solana', 'dogecoin', 'xrp', 'cardano'];

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ids = COINS.join(',');
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
    const data = await response.json();

    // Round snapshotAt to start of current UTC day for deduplication
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const operations = COINS.map(coinId => {
      const coinData = data[coinId];
      if (!coinData) return null;

      return prisma.cryptoSnapshot.upsert({
        where: {
          coinId_snapshotAt: { coinId, snapshotAt: dayStart },
        },
        update: {
          price: coinData.usd || 0,
          marketCap: coinData.usd_market_cap || 0,
          change24h: coinData.usd_24h_change || 0,
          volume24h: coinData.usd_24h_vol || 0,
        },
        create: {
          coinId,
          price: coinData.usd || 0,
          marketCap: coinData.usd_market_cap || 0,
          change24h: coinData.usd_24h_change || 0,
          volume24h: coinData.usd_24h_vol || 0,
          snapshotAt: dayStart,
        },
      });
    }).filter(Boolean);

    await Promise.all(operations);

    return NextResponse.json({
      success: true,
      count: operations.length,
      snapshotAt: dayStart.toISOString(),
    });
  } catch (error) {
    console.error('Crypto snapshot error:', error);
    return NextResponse.json({ error: 'Failed to create crypto snapshots' }, { status: 500 });
  }
}
