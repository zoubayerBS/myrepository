import { NextResponse } from 'next/server';
import { updateVacationStatus } from '@/lib/local-data';

export async function PUT(request: Request, { params }: { params: { vacationId: string } }) {
  // Await params before destructuring
  const awaitedParams = await params;
  const { vacationId } = awaitedParams;

  try {
    const { status } = await request.json();
    const result = await updateVacationStatus(vacationId, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Failed to update vacation status ${vacationId}:`, error);
    return NextResponse.json({ error: 'Failed to update vacation status' }, { status: 500 });
  }
}