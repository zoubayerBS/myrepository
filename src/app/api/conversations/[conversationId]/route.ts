import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const supabase = getDb();

// GET a single conversation with its messages
export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = params;

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:users!senderId(username)')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true });

    if (error) throw error;

    if (!messages || messages.length === 0) {
      const { data: conversation, error: convError } = await supabase.from('conversations').select('id').eq('id', conversationId).single();
      if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error(`Failed to fetch conversation ${conversationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}