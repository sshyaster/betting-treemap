import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/cron-auth';
import { fetchAllNews } from '@/lib/news-fetchers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allNews = await fetchAllNews();

    let archived = 0;
    for (const item of allNews) {
      try {
        const publishedAt = item.publishedAt ? new Date(item.publishedAt) : new Date();
        // Skip invalid dates
        if (isNaN(publishedAt.getTime())) continue;

        await prisma.newsArticle.upsert({
          where: { url: item.url },
          update: {}, // Don't update if already exists
          create: {
            title: item.title,
            url: item.url,
            source: item.source,
            category: item.category,
            publishedAt,
          },
        });
        archived++;
      } catch {
        // Skip duplicates or invalid entries
      }
    }

    return NextResponse.json({
      success: true,
      fetched: allNews.length,
      archived,
    });
  } catch (error) {
    console.error('News archive error:', error);
    return NextResponse.json({ error: 'Failed to archive news' }, { status: 500 });
  }
}
