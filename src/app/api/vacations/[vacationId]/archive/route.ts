import { NextResponse } from 'next/server';
import { updateVacationArchivedStatus } from '@/lib/local-data';

export async function PUT(request: Request, { params }: { params: Promise<{ vacationId: string }> }) {
  const { vacationId } = await params;

  try {
    const { isArchived } = await request.json();
    const result = await updateVacationArchivedStatus(vacationId, isArchived);
    return NextResponse.json(result);
  } catch (error) {
    // @ts-ignore
    console.error(`Failed to update vacation archive status ${vacationId}:`, error);
    return NextResponse.json({ error: 'Failed to update vacation archive status' }, { status: 500 });
  }
}
