import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const supabase = getDb();

// GET all conversations for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const { data: conversations, error } = await supabase
      .rpc('get_conversations_with_details', { user_id_param: userId });

    if (error) throw error;

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST a new conversation
export async function POST(request: Request) {
  try {
    const { participant1Id, participant2Id } = await request.json();

    if (!participant1Id || !participant2Id) {
      return NextResponse.json({ error: 'Both participant IDs are required' }, { status: 400 });
    }

    const { data: existingConversation, error: existingConversationError } = await supabase
      .from('conversations')
      .select('*')
      .or(`(participant1Id.eq.${participant1Id},participant2Id.eq.${participant2Id}),(participant1Id.eq.${participant2Id},participant2Id.eq.${participant1Id})`)
      .single();

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    const newConversation = {
      id: uuidv4(),
      participant1Id,
      participant2Id,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('conversations').insert(newConversation).select().single();

    if (error) throw error;

    const { data: otherParticipant, error: otherParticipantError } = await supabase.from('users').select('username').eq('uid', participant2Id).single();
    if(otherParticipantError) throw otherParticipantError;

    return NextResponse.json({ 
        ...data, 
        otherParticipantName: otherParticipant.username,
        lastMessage: null,
        lastMessageTimestamp: null
    });

  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}