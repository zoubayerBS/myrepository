import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('read', 0);

    if (error) throw error;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to fetch unread notification count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notification count' }, { status: 500 });
  }
}