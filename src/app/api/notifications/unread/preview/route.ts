import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 5; // Default limit to 5

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const notifications = db.prepare(`
      SELECT id, type, message, relatedId, createdAt
      FROM notifications
      WHERE userId = ? AND read = 0
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(userId, limit);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch unread notification preview:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notification preview' }, { status: 500 });
  }
}
