import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
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
    const { count, error } = await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('read', 0);

    if (error) throw error;

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}