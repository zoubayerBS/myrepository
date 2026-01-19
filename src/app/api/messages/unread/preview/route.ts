import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';



export async function GET(request: Request) {
  const supabase = await getDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 5; // Default limit to 5

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, senderId, subject, content, createdAt, sender:users!senderId(username)')
      .eq('receiverId', userId)
      .eq('read', 0)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const formattedMessages = messages.map(message => ({
      id: message.id,
      senderId: message.senderId,
      subject: message.subject,
      content: message.content,
      createdAt: message.createdAt,
      senderName: (message.sender as any)?.username || (Array.isArray(message.sender) ? (message.sender[0] as any)?.username : ''),
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Failed to fetch unread message preview:', error);
    return NextResponse.json({ error: 'Failed to fetch unread message preview' }, { status: 500 });
  }
}
