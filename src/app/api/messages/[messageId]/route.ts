import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const supabase = getDb();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error(`Database error deleting message ${messageId}:`, error);
      throw new Error(error.message);
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
