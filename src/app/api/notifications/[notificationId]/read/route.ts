import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const supabase = createAdminClient();
  const { notificationId } = await params;

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