import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available.");

    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiverId = ? AND read = 0');
    const result = stmt.get(userId) as { count: number };

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Failed to fetch unread message count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread message count' }, { status: 500 });
  }
}