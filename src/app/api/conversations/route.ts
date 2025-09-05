
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all conversations for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const conversations = db.prepare(`
      SELECT 
        c.id, 
        c.updatedAt, 
        CASE
          WHEN c.participant1Id = ? THEN p2.username
          ELSE p1.username
        END as otherParticipantName,
        (SELECT content FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT createdAt FROM messages WHERE conversationId = c.id ORDER BY createdAt DESC LIMIT 1) as lastMessageTimestamp
      FROM conversations c
      JOIN users p1 ON c.participant1Id = p1.uid
      JOIN users p2 ON c.participant2Id = p2.uid
      WHERE c.participant1Id = ? OR c.participant2Id = ?
      ORDER BY c.updatedAt DESC
    `).all(userId, userId, userId);

    console.log('Fetched conversations:', conversations);

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST a new conversation
export async function POST(request: Request) {
  try {
    const { participant1Id, participant2Id } = await request.json();

    if (!participant1Id || !participant2Id) {
      return NextResponse.json({ error: 'Both participant IDs are required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    // Check if a conversation already exists
    const existingConversation = db.prepare(`
      SELECT * FROM conversations
      WHERE (participant1Id = ? AND participant2Id = ?) OR (participant1Id = ? AND participant2Id = ?)
    `).get(participant1Id, participant2Id, participant2Id, participant1Id);

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    const newConversation = {
      id: uuidv4(),
      participant1Id,
      participant2Id,
      updatedAt: new Date().toISOString(),
    };

    db.prepare(
      'INSERT INTO conversations (id, participant1Id, participant2Id, updatedAt) VALUES (?, ?, ?, ?)'
    ).run(newConversation.id, newConversation.participant1Id, newConversation.participant2Id, newConversation.updatedAt);

    const otherParticipant = db.prepare('SELECT username FROM users WHERE uid = ?').get(participant2Id) as { username: string };

    return NextResponse.json({ 
        ...newConversation, 
        otherParticipantName: otherParticipant.username,
        lastMessage: null,
        lastMessageTimestamp: null
    });

  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
