import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COINS = ['bitcoin', 'ethereum', 'solana', 'dogecoin', 'xrp', 'cardano'];

export async function GET() {
  try {
    const ids = COINS.join(',');
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { next: { revalidate: 30 } } // Cache for 30 seconds
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data = await response.json();

    const prices = COINS.map(id => ({
      id,
      symbol: getSymbol(id),
      name: getName(id),
      price: data[id]?.usd || 0,
      change24h: data[id]?.usd_24h_change || 0,
      marketCap: data[id]?.usd_market_cap || 0,
    }));

    return NextResponse.json({
      prices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Crypto fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto prices' },
      { status: 500 }
    );
  }
}

function getSymbol(id: string): string {
  const symbols: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    dogecoin: 'DOGE',
    xrp: 'XRP',
    cardano: 'ADA',
  };
  return symbols[id] || id.toUpperCase();
}

function getName(id: string): string {
  const names: Record<string, string> = {
    bitcoin: 'Bitcoin',
    ethereum: 'Ethereum',
    solana: 'Solana',
    dogecoin: 'Dogecoin',
    xrp: 'XRP',
    cardano: 'Cardano',
  };
  return names[id] || id;
}
