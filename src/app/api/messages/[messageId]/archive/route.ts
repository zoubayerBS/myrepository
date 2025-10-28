import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const supabase = getDb();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const { isArchived } = await request.json(); // Expecting { isArchived: true } or { isArchived: false }

    const { error } = await supabase
      .from('messages')
      .update({ isArchived: isArchived ? 1 : 0 })
      .eq('id', messageId);

    if (error) {
      console.error(`Database error updating archive status for message ${messageId}:`, error);
      throw new Error(error.message);
    }

    return NextResponse.json({ message: `Message ${isArchived ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    console.error('Failed to update archive status:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}