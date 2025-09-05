
import { GET, POST } from './route';
import { db } from '@/lib/db';

// Mock Request class for testing API routes
class MockRequest {
  url: string;
  method: string;
  _json: any;
  params: any;

  constructor(url: string, options: { method?: string; body?: any; params?: any } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this._json = options.body;
    this.params = options.params; // Store params for dynamic routes
  }

  async json() {
    return this._json;
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      return {
        status: options?.status || 200,
        json: () => Promise.resolve(data),
      };
    }),
  },
}));

// Mock the database module
jest.mock('@/lib/db', () => {
  const mockPrepare = jest.fn((sql) => ({
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    _sql: sql, // Store the SQL for assertion if needed
  }));
  return {
    db: {
      prepare: mockPrepare,
      transaction: jest.fn((cb) => () => cb()),
    },
  };
});

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('GET /api/conversations/[conversationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return messages for a conversation if user is a participant', async () => {
    const mockMessages = [
      { id: 'msg1', content: 'Hello', senderId: 'user1', senderName: 'User One' },
    ];
    
    // Mock db.prepare calls
    (db.prepare as jest.Mock)
      .mockImplementationOnce((sql) => {
        expect(sql).toBe('SELECT 1 FROM conversation_participants WHERE conversationId = ? AND userId = ?');
        return { get: jest.fn().mockReturnValueOnce({ userId: 'user1' }) };
      })
      .mockImplementationOnce((sql) => {
        expect(sql).toBe('SELECT\n        m.id,\n        m.content,\n        m.createdAt,\n        m.senderId,\n        u.username as senderName\n      FROM messages m\n      JOIN users u ON m.senderId = u.uid\n      WHERE m.conversationId = ?\n      ORDER BY m.createdAt ASC');
        return { all: jest.fn().mockReturnValueOnce(mockMessages) };
      });

    const request = new MockRequest('http://localhost/api/conversations/convo1?userId=user1', {
      params: { conversationId: 'convo1' },
    });
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).toHaveBeenCalledTimes(2);
    expect((db.prepare as jest.Mock).mock.results[0].value.get).toHaveBeenCalledWith('convo1', 'user1');
    expect((db.prepare as jest.Mock).mock.results[1].value.all).toHaveBeenCalledWith('convo1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockMessages);
  });

  it('should return 403 if user is not a participant', async () => {
    (db.prepare as jest.Mock).mockImplementationOnce((sql) => {
      expect(sql).toBe('SELECT 1 FROM conversation_participants WHERE conversationId = ? AND userId = ?');
      return { get: jest.fn().mockReturnValueOnce(undefined) };
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1?userId=user1', {
      params: { conversationId: 'convo1' },
    });
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).toHaveBeenCalledTimes(1);
    expect((db.prepare as jest.Mock).mock.results[0].value.get).toHaveBeenCalledWith('convo1', 'user1');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if userId is missing', async () => {
    const request = new MockRequest('http://localhost/api/conversations/convo1', {
      params: { conversationId: 'convo1' },
    });
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).not.toHaveBeenCalled(); // No DB calls if userId is missing
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'User ID is required' });
  });
});

describe('POST /api/conversations/[conversationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a new message to a conversation', async () => {
    const mockNewMessage = { id: 'mock-uuid', content: 'Test message', senderId: 'user1', createdAt: expect.any(String), senderName: 'User One' };

    (db.prepare as jest.Mock)
      .mockImplementationOnce((sql) => { // Participant check
        expect(sql).toBe('SELECT 1 FROM conversation_participants WHERE conversationId = ? AND userId = ?');
        return { get: jest.fn().mockReturnValueOnce({ userId: 'user1' }) };
      })
      .mockImplementationOnce((sql) => { // Insert message
        expect(sql).toBe('INSERT INTO messages (id, conversationId, senderId, content, createdAt) VALUES (?, ?, ?, ?, ?)');
        return { run: jest.fn().mockReturnValue({}) };
      })
      .mockImplementationOnce((sql) => { // Update conversation
        expect(sql).toBe('UPDATE conversations SET updatedAt = ? WHERE id = ?');
        return { run: jest.fn().mockReturnValue({}) };
      })
      .mockImplementationOnce((sql) => { // Select new message
        expect(sql).toBe('SELECT * FROM messages WHERE id = ?');
        return { get: jest.fn().mockReturnValueOnce(mockNewMessage) };
      });

    const request = new MockRequest('http://localhost/api/conversations/convo1', {
      method: 'POST',
      body: { senderId: 'user1', content: 'Test message' },
      params: { conversationId: 'convo1' },
    });
    const response = await POST(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).toHaveBeenCalledTimes(4);
    expect((db.prepare as jest.Mock).mock.results[0].value.get).toHaveBeenCalledWith('convo1', 'user1');
    expect((db.prepare as jest.Mock).mock.results[1].value.run).toHaveBeenCalledWith('mock-uuid', 'convo1', 'user1', 'Test message', expect.any(String));
    expect((db.prepare as jest.Mock).mock.results[2].value.run).toHaveBeenCalledWith(expect.any(String), 'convo1');
    expect((db.prepare as jest.Mock).mock.results[3].value.get).toHaveBeenCalledWith('mock-uuid');
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(mockNewMessage);
  });

  it('should return 403 if user is not a participant', async () => {
    (db.prepare as jest.Mock).mockImplementationOnce((sql) => {
      expect(sql).toBe('SELECT 1 FROM conversation_participants WHERE conversationId = ? AND userId = ?');
      return { get: jest.fn().mockReturnValueOnce(undefined) };
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1', {
      method: 'POST',
      body: { senderId: 'user1', content: 'Test message' },
      params: { conversationId: 'convo1' },
    });
    const response = await POST(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).toHaveBeenCalledTimes(1);
    expect((db.prepare as jest.Mock).mock.results[0].value.get).toHaveBeenCalledWith('convo1', 'user1');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if senderId or content is missing', async () => {
    const request = new MockRequest('http://localhost/api/conversations/convo1', {
      method: 'POST',
      body: { senderId: 'user1' }, // Missing content
      params: { conversationId: 'convo1' },
    });
    const response = await POST(request as any, { params: { conversationId: 'convo1' } });

    expect(db.prepare).not.toHaveBeenCalled(); // No DB calls if senderId/content is missing
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Sender ID and content are required' });
  });
});
