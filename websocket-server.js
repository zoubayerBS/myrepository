
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

const WEBSOCKET_PORT = 8080;

// --- Database Setup ---
// Re-implementing DB connection here because we can't import the TS module easily.
const dbPath = path.resolve(__dirname, 'src/db/db.sqlite');
let db;
try {
  db = new Database(dbPath);
  console.log('Successfully connected to the database.');
} catch (error) {
  console.error('Failed to connect to the database:', error);
  process.exit(1);
}

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
function handlePrivateMessage(payload) {
  const { conversationId, senderId, content } = payload;

  if (!conversationId || !senderId || !content) {
    console.error('Invalid private message payload:', payload);
    return;
  }

  // 1. Persist the message to the database
  const now = new Date().toISOString();
  const messageId = randomUUID();

  try {
    db.transaction(() => {
      db.prepare(
        'INSERT INTO messages (id, conversationId, senderId, content, createdAt) VALUES (?, ?, ?, ?, ?)'
      ).run(messageId, conversationId, senderId, content, now);

      db.prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?').run(now, conversationId);
    })();

    const newMessage = {
        id: messageId,
        conversationId,
        senderId,
        content,
        createdAt: now,
        senderName: db.prepare('SELECT username FROM users WHERE uid = ?').get(senderId)?.username
    };

    // 2. Find participants of the conversation
    const participants = db.prepare(
      'SELECT userId FROM conversation_participants WHERE conversationId = ?'
    ).all(conversationId);

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
