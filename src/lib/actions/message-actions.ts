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
  const db = await getDb(); // Get the database instance
  if (!db) throw new Error("Database not available."); // Add a check for safety

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

  db.prepare(
    'INSERT INTO messages (id, conversationId, senderId, receiverId, subject, content, read, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    newMessage.id,
    newMessage.conversationId,
    newMessage.senderId,
    newMessage.receiverId,
    newMessage.subject,
    newMessage.content,
    newMessage.read,
    newMessage.createdAt
  );

  return newMessage;
}
