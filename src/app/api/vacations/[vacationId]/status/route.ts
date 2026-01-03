import { NextResponse } from 'next/server';
import { updateVacationStatus } from '@/lib/local-data';

export async function PUT(request: Request, { params }: { params: Promise<{ vacationId: string }> }) {
  const { vacationId } = await params;

  try {
    const { status } = await request.json();
    const result = await updateVacationStatus(vacationId, status);
    return NextResponse.json(result);
  } catch (error) {
    // @ts-ignore
    console.error(`Failed to update vacation status ${vacationId}:`, error);
    return NextResponse.json({ error: 'Failed to update vacation status' }, { status: 500 });
  }
}