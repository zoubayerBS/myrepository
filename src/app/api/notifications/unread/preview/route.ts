import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 5; // Default limit to 5

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, message, relatedId, createdAt')
      .eq('userId', userId)
      .eq('read', 0)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch unread notification preview:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notification preview' }, { status: 500 });
  }
}