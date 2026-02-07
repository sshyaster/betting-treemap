import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Get user's saved articles
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const saved = await prisma.savedArticle.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: 'desc' },
  });

  return NextResponse.json({ saved });
}

// Save an article
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, url, source, category } = body;

  if (!title || !url) {
    return NextResponse.json({ error: 'Title and URL required' }, { status: 400 });
  }

  const saved = await prisma.savedArticle.upsert({
    where: {
      userId_url: { userId: session.user.id, url },
    },
    update: {},
    create: {
      userId: session.user.id,
      title,
      url,
      source: source || 'Unknown',
      category: category || 'other',
    },
  });

  return NextResponse.json({ saved });
}

// Unsave an article
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  await prisma.savedArticle.deleteMany({
    where: { userId: session.user.id, url },
  });

  return NextResponse.json({ success: true });
}
