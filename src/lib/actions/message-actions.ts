'use server';

import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface SendMessageParams {
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
}

export async function sendMessage({ senderId, receiverId, subject, content }: SendMessageParams) {
  const supabase = await getDb();
  const newMessage = {
    id: uuidv4(),
    conversationId: uuidv4(), // Unique for each message in this email-like system
    senderId,
    receiverId,
    subject,
    content,
    read: 0, // Default to unread
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('messages').insert(newMessage).select().single();

  if (error) throw error;

  return data;
}