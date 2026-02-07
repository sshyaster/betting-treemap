import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Kraken pairs for our tracked coins
const COINS: { id: string; pair: string }[] = [
  { id: 'bitcoin', pair: 'XBTUSD' },
  { id: 'ethereum', pair: 'ETHUSD' },
  { id: 'solana', pair: 'SOLUSD' },
  { id: 'dogecoin', pair: 'DOGEUSD' },
  { id: 'xrp', pair: 'XRPUSD' },
  { id: 'cardano', pair: 'ADAUSD' },
  { id: 'avalanche', pair: 'AVAXUSD' },
  { id: 'chainlink', pair: 'LINKUSD' },
];

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let saved = 0;

    for (const coin of COINS) {
      try {
        // Fetch daily OHLC from Kraken (interval=1440 = 1 day)
        const res = await fetch(
          `https://api.kraken.com/0/public/OHLC?pair=${coin.pair}&interval=1440&since=${Math.floor((now.getTime() - 2 * 86400000) / 1000)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) continue;

        const data = await res.json();
        if (data.error?.length > 0) continue;

        const resultKey = Object.keys(data.result || {}).find(k => k !== 'last');
        if (!resultKey) continue;

        const candles = data.result[resultKey] as Array<[number, string, string, string, string, string, string, number]>;
        if (!candles?.length) continue;

        // Get the most recent complete daily candle
        const latestCandle = candles[candles.length - 1];
        const [time, open, high, low, close, , volume] = latestCandle;

        const candleDate = new Date(time * 1000);
        const candleDayStart = new Date(Date.UTC(candleDate.getUTCFullYear(), candleDate.getUTCMonth(), candleDate.getUTCDate()));

        await prisma.cryptoOHLC.upsert({
          where: {
            coinId_date: { coinId: coin.id, date: candleDayStart },
          },
          update: {
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume),
          },
          create: {
            coinId: coin.id,
            date: candleDayStart,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume),
          },
        });
        saved++;
      } catch {
        // Skip this coin, continue with others
      }
    }

    return NextResponse.json({
      success: true,
      saved,
      snapshotAt: dayStart.toISOString(),
    });
  } catch (error) {
    console.error('OHLC archive error:', error);
    return NextResponse.json({ error: 'Failed to archive OHLC data' }, { status: 500 });
  }
}
