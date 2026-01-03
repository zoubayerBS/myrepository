
import { NextResponse } from 'next/server';
import { deleteSurgeon } from '@/lib/local-data';

export async function DELETE(request: Request, { params }: { params: Promise<{ surgeonId: string }> }) {
  const { surgeonId } = await params;
  try {
    await deleteSurgeon(parseInt(surgeonId));
    return NextResponse.json({ message: 'Surgeon deleted' });
  } catch (error) {
    console.error(`Failed to delete surgeon ${surgeonId}:`, error);
    return NextResponse.json({ error: 'Failed to delete surgeon' }, { status: 500 });
  }
}
