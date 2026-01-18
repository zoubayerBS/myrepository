import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { count, error } = await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('userId', userId)
      .eq('read', 0);

    if (error) throw error;

    return NextResponse.json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error(`Failed to clear all notifications for user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to clear all notifications' }, { status: 500 });
  }
}