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
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available.");

    const messages = db.prepare(`
      SELECT m.id, m.senderId, m.subject, m.content, m.createdAt, u.username as senderName
      FROM messages m
      JOIN users u ON m.senderId = u.uid
      WHERE m.receiverId = ? AND m.read = 0
      ORDER BY m.createdAt DESC
      LIMIT ?
    `).all(userId, limit);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch unread message preview:', error);
    return NextResponse.json({ error: 'Failed to fetch unread message preview' }, { status: 500 });
  }
}