import { NextResponse } from 'next/server';
import { findAllVacations, findVacationsByUserId, addVacation, findArchivedVacations } from '@/lib/local-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const archivedOnly = searchParams.get('archivedOnly') === 'true';
  const page = searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
  
  // Get filter params
  const status = searchParams.get('statusFilter') || 'all';
  const type = searchParams.get('typeFilter') || 'all';
  const motif = searchParams.get('motifFilter') || 'all';
  const userFilter = searchParams.get('userFilter') || 'all';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchQuery = searchParams.get('searchQuery') || '';
  const userDefaultView = searchParams.get('userDefaultView') === 'true';

  const options = { page, limit, status, type, motif, userFilter, startDate, endDate, searchQuery, userDefaultView };

  try {
    if (userId) {
      const { vacations, total } = await findVacationsByUserId(userId, options);
      return NextResponse.json({ vacations, total });
    }

    if (archivedOnly) {
      // Assuming findArchivedVacations will be updated to handle filters too
      const { vacations, total } = await findArchivedVacations(options);
      return NextResponse.json({ vacations, total });
    }

    // Assuming findAllVacations will be updated to handle filters
    const { vacations, total } = await findAllVacations({ ...options, includeArchived });
    return NextResponse.json({ vacations, total });
  } catch (error) {
    console.error('Failed to fetch vacations:', error);
    return NextResponse.json({ error: 'Failed to fetch vacations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newVacation = await request.json();
    const addedVacation = await addVacation(newVacation);
    return NextResponse.json(addedVacation, { status: 201 });
  } catch (error) {
    console.error('Failed to add vacation:', error);
    return NextResponse.json({ error: 'Failed to add vacation' }, { status: 500 });
  }
}