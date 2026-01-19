import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';



export async function PUT(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const supabase = await getDb();
  const { messageId } = await params;

  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: 1 })
      .eq('id', messageId);

    if (error) throw error;

    return NextResponse.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(`Failed to mark message ${messageId} as read:`, error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
