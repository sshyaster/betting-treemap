import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoNews, fetchGoogleNews, GOOGLE_NEWS_TOPICS } from '@/lib/news-fetchers';
import type { NewsItem } from '@/lib/news-fetchers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'all';

  const results: NewsItem[] = [];

  if (category === 'all' || category === 'crypto') {
    results.push(...await fetchCryptoNews());
  }
  if (category === 'all' || category === 'economy') {
    results.push(...await fetchGoogleNews(GOOGLE_NEWS_TOPICS.economy, 'economy'));
  }
  if (category === 'all' || category === 'politics') {
    results.push(...await fetchGoogleNews(GOOGLE_NEWS_TOPICS.politics, 'politics'));
  }

  return NextResponse.json(
    { news: results },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
