import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0');
    const result = stmt.run(userId);

    return NextResponse.json({ message: `Marked ${result.changes} notifications as read` });
  } catch (error) {
    console.error(`Failed to clear all notifications for user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to clear all notifications' }, { status: 500 });
  }
}
