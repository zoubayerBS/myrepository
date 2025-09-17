import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// This is a comment to force git to recognize the change.
const supabase = getDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiverId', userId)
      .eq('read', 0);

    if (error) throw error;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to fetch unread message count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread message count' }, { status: 500 });
  }
}