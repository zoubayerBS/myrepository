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
    // RLS filtre automatiquement par auth.uid()
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('read', 0)
      .order('createdAt', { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notifications' }, { status: 500 });
  }
}