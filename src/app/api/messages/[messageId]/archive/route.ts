import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { messageId: string } }) {
  const { messageId } = params;
  const { isArchived } = await request.json();

  if (!messageId || typeof isArchived === 'undefined') {
    return NextResponse.json({ error: 'Message ID and isArchived status are required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const result = db.prepare(
      'UPDATE messages SET isArchived = ? WHERE id = ?'
    ).run(isArchived ? 1 : 0, messageId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Message not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Archive status updated successfully' });
  } catch (error) {
    console.error('Failed to update archive status:', error);
    return NextResponse.json({ error: 'Failed to update archive status' }, { status: 500 });
  }
}
