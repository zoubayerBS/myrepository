
import { NextResponse } from 'next/server';
import { findAllVacations, findVacationsByUserId, addVacation } from '@/lib/local-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (userId) {
      const vacations = await findVacationsByUserId(userId);
      return NextResponse.json(vacations);
    } else {
      const vacations = await findAllVacations();
      return NextResponse.json(vacations);
    }
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
