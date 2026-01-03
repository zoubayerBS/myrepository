
import { NextResponse } from 'next/server';
import { updateVacation, deleteVacation } from '@/lib/local-data';

export async function PUT(request: Request, { params }: { params: Promise<{ vacationId: string }> }) {
  const { vacationId } = await params;
  try {
    const updatedVacation = await request.json();
    const result = await updateVacation({ ...updatedVacation, id: vacationId });
    return NextResponse.json(result);
  } catch (error) {
    // @ts-ignore
    console.error(`Failed to update vacation ${vacationId}:`, error);
    return NextResponse.json({ error: 'Failed to update vacation' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ vacationId: string }> }) {
  try {
    const { vacationId } = await params;
    await deleteVacation(vacationId);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete vacation', error);
    return NextResponse.json({ error: 'Failed to delete vacation' }, { status: 500 });
  }
}
