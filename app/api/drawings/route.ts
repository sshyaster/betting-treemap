import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get('coinId');
  const interval = searchParams.get('interval');

  if (!coinId || !interval) {
    return NextResponse.json({ error: 'Missing coinId or interval' }, { status: 400 });
  }

  const drawings = await prisma.drawing.findMany({
    where: {
      userId: session.user.id,
      coinId,
      interval,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(drawings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { coinId, interval, toolType, points, color } = body;

  if (!coinId || !interval || !toolType || !points) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const drawing = await prisma.drawing.create({
    data: {
      userId: session.user.id,
      coinId,
      interval,
      toolType,
      points,
      color: color || '#3b82f6',
    },
  });

  return NextResponse.json(drawing, { status: 201 });
}
