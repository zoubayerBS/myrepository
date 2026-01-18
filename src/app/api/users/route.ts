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

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const username = searchParams.get('username');

  try {
    // Si un UID ou username spécifique est demandé
    if (uid) {
      // RLS vérifie automatiquement l'accès
      const { data, error } = await supabase
        .from('users')
        .select('uid, email, username, role, nom, prenom, fonction')
        .eq('uid', uid)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (username) {
      // RLS vérifie automatiquement l'accès
      const { data, error } = await supabase
        .from('users')
        .select('uid, email, username, role, nom, prenom, fonction')
        .eq('username', username)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Liste complète : vérifier que l'utilisateur est admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // RLS permet aux admins de voir tous les utilisateurs
    const { data, error } = await supabase
      .from('users')
      .select('uid, email, username, role, nom, prenom, fonction')
      .order('username');

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
