import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const supabase = getDb();

export async function PUT(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  const { messageId } = params;
  const { archived } = await request.json(); // Expecting { archived: true } or { archived: false }

  try {
    const { error } = await supabase
      .from('messages')
      .update({ isArchived: archived ? 1 : 0 })
      .eq('id', messageId);

    if (error) throw error;

    return NextResponse.json({ message: `Message ${archived ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    console.error(`Failed to update archive status for message ${messageId}:`, error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}