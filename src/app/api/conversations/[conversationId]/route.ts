
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  const { conversationId } = params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    // First, verify the user is part of the conversation
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND (participant1Id = ? OR participant2Id = ?)').get(conversationId, userId, userId);

    if (!conversation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messages = db.prepare(`
      SELECT m.*, u.username as senderName
      FROM messages m
      JOIN users u ON m.senderId = u.uid
      WHERE m.conversationId = ?
      ORDER BY m.createdAt ASC
    `).all(conversationId);

    return NextResponse.json(messages);
  } catch (error) {
    console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
