import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const supabase = await createClient();

  // Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  const { notificationId } = await params;

  try {
    // RLS vérifie automatiquement que la notification appartient à l'utilisateur
    const { error } = await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('id', notificationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}