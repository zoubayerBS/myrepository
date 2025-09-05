const { WebSocketServer } = require('ws');
const { supabase } = require('./src/lib/supabase-node');
const { randomUUID } = require('crypto');

const WEBSOCKET_PORT = 8080;

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

// In-memory map to store connections { userId: WebSocket }
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');
  let userId = null; // To store the user ID for this connection

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // --- Message Handling ---
      switch (data.type) {
        case 'register':
          userId = data.payload.userId;
          if (userId) {
            clients.set(userId, ws);
            console.log(`Client registered with userId: ${userId}`);
          }
          break;

        case 'private_message':
          handlePrivateMessage(data.payload);
          break;

        default:
          console.log('Received unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// --- Business Logic ---
async function handlePrivateMessage(payload) {
  const { conversationId, senderId, content } = payload;

  if (!conversationId || !senderId || !content) {
    console.error('Invalid private message payload:', payload);
    return;
  }

  // 1. Persist the message to the database
  const now = new Date().toISOString();
  const messageId = randomUUID();

  try {
    const { data: messageData, error: messageError } = await supabase.from('messages').insert({ id: messageId, conversationId, senderId, content, createdAt: now }).select().single();
    if(messageError) throw messageError;

    const { error: convError } = await supabase.from('conversations').update({ updatedAt: now }).eq('id', conversationId);
    if(convError) throw convError;

    const { data: sender, error: senderError } = await supabase.from('users').select('username').eq('uid', senderId).single();
    if(senderError) throw senderError;

    const newMessage = {
        ...messageData,
        senderName: sender.username
    };

    // 2. Find participants of the conversation
    const { data: participants, error: participantsError } = await supabase.from('conversation_participants').select('userId').eq('conversationId', conversationId);
    if(participantsError) throw participantsError;

    // 3. Forward the message to connected participants
    participants.forEach(({ userId }) => {
      if (userId !== senderId) { // Don't send back to the sender
        const recipientSocket = clients.get(userId);
        if (recipientSocket && recipientSocket.readyState === require('ws').OPEN) {
          recipientSocket.send(JSON.stringify({ type: 'new_message', payload: newMessage }));
          console.log(`Forwarded message to ${userId}`);
        }
      }
    });

  } catch (error) {
    console.error('Failed to handle private message:', error);
  }
}

console.log(`WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`);