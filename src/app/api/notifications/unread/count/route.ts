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
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('userId', user.id)
      .eq('read', 0);

    if (error) throw error;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to fetch unread notification count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread notification count' }, { status: 500 });
  }
}