import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { findAllVacations, findVacationsByUserId, addVacation, findArchivedVacations } from '@/lib/local-data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const archivedOnly = searchParams.get('archivedOnly') === 'true';
  const page = searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;

  // Get filter params
  const status = searchParams.get('statusFilter') || 'all';
  const type = searchParams.get('typeFilter') || 'all';
  const motif = searchParams.get('motifFilter') || 'all';
  const userFilter = searchParams.get('userFilter') || 'all';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const searchQuery = searchParams.get('searchQuery') || '';
  const userDefaultView = searchParams.get('userDefaultView') === 'true';

  const options = { page, limit, status, type, motif, userFilter, startDate, endDate, searchQuery, userDefaultView };

  try {
    // Vérifier si l'utilisateur est admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('uid', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Les admins peuvent voir toutes les vacations, les users seulement les leurs
    // RLS gère automatiquement l'isolation des données
    if (archivedOnly) {
      const { vacations, total } = await findArchivedVacations(options);
      return NextResponse.json({ vacations, total });
    }

    if (isAdmin) {
      const { vacations, total } = await findAllVacations({ ...options, includeArchived });
      return NextResponse.json({ vacations, total });
    } else {
      // Pour les utilisateurs normaux, utiliser leur UID (RLS vérifie automatiquement)
      const { vacations, total } = await findVacationsByUserId(user.id, options);
      return NextResponse.json({ vacations, total });
    }
  } catch (error: any) {
    console.error('[API VACATIONS] Fetch error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({
      error: 'Failed to fetch vacations',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const newVacation = await request.json();

    // S'assurer que le userId correspond à l'utilisateur authentifié
    // RLS vérifiera automatiquement cette contrainte
    newVacation.userId = user.id;

    const addedVacation = await addVacation(newVacation);

    // Invalidate caches
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/dashboard/historique-vacations');
    revalidatePath('/api/vacations');

    return NextResponse.json(addedVacation, { status: 201 });
  } catch (error) {
    console.error('Failed to add vacation:', error);
    return NextResponse.json({ error: 'Failed to add vacation' }, { status: 500 });
  }
}