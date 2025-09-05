import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all messages for a user (inbox)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type') || 'received'; // Default to received

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    let query = `
      SELECT m.id, m.senderId, m.receiverId, m.subject, m.content, m.read, m.createdAt, m.isArchived,
             u_sender.username as senderName, u_receiver.username as receiverName
      FROM messages m
      JOIN users u_sender ON m.senderId = u_sender.uid
      LEFT JOIN users u_receiver ON m.receiverId = u_receiver.uid
    `;
    let params: string[] = [];

    switch (type) {
      case 'received':
        query += ' WHERE m.receiverId = ? AND m.isArchived = 0';
        params.push(userId);
        break;
      case 'sent':
        query += ' WHERE m.senderId = ? AND m.isArchived = 0';
        params.push(userId);
        break;
      case 'archived':
        query += ' WHERE (m.receiverId = ? OR m.senderId = ?) AND m.isArchived = 1';
        params.push(userId, userId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    query += ' ORDER BY m.createdAt DESC';

    const messages = db.prepare(query).all(...params);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST a new message
export async function POST(request: Request) {
  try {
    const { senderId, receiverId, subject, content } = await request.json();

    if (!senderId || !receiverId || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const newMessage = {
      id: uuidv4(),
      conversationId: uuidv4(),
      senderId,
      receiverId,
      subject,
      content,
      read: 0,
      isArchived: 0, // New field
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      'INSERT INTO messages (id, conversationId, senderId, receiverId, subject, content, read, isArchived, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      newMessage.id,
      newMessage.conversationId,
      newMessage.senderId,
      newMessage.receiverId,
      newMessage.subject,
      newMessage.content,
      newMessage.read,
      newMessage.isArchived,
      newMessage.createdAt
    );

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
