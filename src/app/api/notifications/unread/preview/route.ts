import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  // Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  try {
    // Explicit filter by userId to ensure isolation
    // user.id from Supabase Auth should match userId in notifications table
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.id)
      .eq('read', 0)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notifications' }, { status: 500 });
  }
}