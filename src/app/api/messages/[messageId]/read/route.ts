import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { messageId: string } }) {
  const { messageId } = params;

  try {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available."); // Add a check for safety

    db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(messageId);
    return NextResponse.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(`Failed to mark message ${messageId} as read:`, error);
    return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
  }
}