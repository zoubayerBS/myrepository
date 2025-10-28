import { NextResponse } from 'next/server';
import { findAllVacations, findVacationsByUserId, addVacation, findArchivedVacations } from '@/lib/local-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const archivedOnly = searchParams.get('archivedOnly') === 'true';

  try {
    if (userId) {
      const vacations = await findVacationsByUserId(userId);
      return NextResponse.json(vacations);
    }

    if (archivedOnly) {
      const vacations = await findArchivedVacations();
      return NextResponse.json(vacations);
    }

    const vacations = await findAllVacations({ includeArchived });
    return NextResponse.json(vacations);
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