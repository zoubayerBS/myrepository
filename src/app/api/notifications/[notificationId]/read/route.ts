import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { notificationId: string } }) {
  const { notificationId } = params;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?');
    const result = stmt.run(notificationId);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Notification not found or already read' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(`Failed to mark notification ${notificationId} as read:`, error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
