import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Query archived news — searchable history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const days = Math.min(parseInt(searchParams.get('days') || '30') || 30, 365);
  const search = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100') || 100, 500);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    publishedAt: { gte: since },
  };
  if (category && category !== 'all') where.category = category;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const articles = await prisma.newsArticle.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      url: true,
      source: true,
      category: true,
      publishedAt: true,
    },
  });

  return NextResponse.json(
    { count: articles.length, articles },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
}
