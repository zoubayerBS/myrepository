import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const supabase = getDb();

export async function PUT(
  request: Request,
  { params }: { params: { notificationId: string } }
) {
  const { notificationId } = params;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('id', notificationId);

    if (error) throw error;

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(`Failed to mark notification ${notificationId} as read:`, error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}