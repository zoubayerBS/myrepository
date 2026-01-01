import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const supabase = getDb();

// GET all messages for a user (inbox)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type') || 'received'; // Default to received

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('messages')
      .select(`
        id,
        senderId,
        receiverId,
        subject,
        content,
        read,
        isArchived,
        createdAt,
        sender:users!senderId(username),
        receiver:users!receiverId(username)
      `);

    switch (type) {
      case 'received':
        query = query.eq('receiverId', userId).eq('isArchived', 0);
        break;
      case 'sent':
        query = query.eq('senderId', userId).eq('isArchived', 0);
        break;
      case 'archived':
        query = query.or(`receiverId.eq.${userId},senderId.eq.${userId}`).eq('isArchived', 1);
        break;
      default:
        return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    const { data: messages, error } = await query.order('createdAt', { ascending: false });

    if (error) throw error;

    // Map the data to ensure senderName and receiverName are always strings
    const formattedMessages = messages.map(msg => ({
      ...msg,
      senderName: (msg.sender as any)?.username || '',
      receiverName: (msg.receiver as any)?.username || '',
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST a new message
export async function POST(request: Request) {
  try {
    const { senderId, receiverId, subject, content, conversationId } = await request.json();

    if (!senderId || !receiverId || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newMessage = {
      id: uuidv4(),
      conversationId: conversationId || uuidv4(),
      senderId,
      receiverId,
      subject,
      content,
      read: 0,
      isArchived: 0,
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('messages').insert(newMessage).select().single();

    if (error) throw error;

    // Update conversation timestamp if it exists
    if (conversationId) {
      await supabase.from('conversations').update({ updatedAt: new Date().toISOString() }).eq('id', conversationId);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
