
import { GET, POST } from './route';
import { db } from '@/lib/db';

// Mock Request class for testing API routes
class MockRequest {
  url: string;
  method: string;
  _json: any;

  constructor(url: string, options: { method?: string; body?: any } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this._json = options.body;
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
jest.mock('@/lib/db', () => ({
  db: {
    prepare: jest.fn().mockReturnThis(),
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    transaction: jest.fn((cb) => () => cb()), // Mock transaction to execute callback directly
  },
}));

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('GET /api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of conversations for a given user', async () => {
    const mockConversations = [
      { id: 'convo1', updatedAt: '2024-01-01T10:00:00Z', otherParticipantName: 'User Two', lastMessage: 'Hi', lastMessageTimestamp: '2024-01-01T10:00:00Z' },
    ];
    (db.prepare().all as jest.Mock).mockReturnValue(mockConversations);

    const request = new MockRequest('http://localhost/api/conversations?userId=user1');
    const response = await GET(request as any);

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(db.prepare().all).toHaveBeenCalledWith('user1', 'user1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockConversations);
  });

  it('should return 400 if userId is missing', async () => {
    const request = new MockRequest('http://localhost/api/conversations');
    const response = await GET(request as any);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'User ID is required' });
  });
});

describe('POST /api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new conversation if one does not exist', async () => {
    (db.prepare().get as jest.Mock).mockReturnValueOnce(undefined); // No existing conversation
    (db.prepare().run as jest.Mock).mockReturnValue({});
    (db.prepare().get as jest.Mock).mockReturnValueOnce({ username: 'ParticipantUser' }); // For otherParticipantName

    const request = new MockRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: { creatorId: 'user1', participantId: 'user2' },
    });
    const response = await POST(request as any);

    expect(db.prepare().get).toHaveBeenCalledWith('user1', 'user2'); // Check for existing convo
    expect(db.prepare().run).toHaveBeenCalledTimes(2); // Insert convo and participants
    expect(db.prepare().run).toHaveBeenCalledWith('mock-uuid', expect.any(String), expect.any(String));
    expect(db.prepare().run).toHaveBeenCalledWith('user1', 'mock-uuid', 'user2', 'mock-uuid');
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      id: 'mock-uuid',
      otherParticipantName: 'ParticipantUser',
    }));
  });

  it('should return existing conversation if one already exists', async () => {
    const existingConvo = { id: 'existing-convo', updatedAt: '2024-01-01T10:00:00Z' };
    (db.prepare().get as jest.Mock).mockReturnValueOnce(existingConvo); // Existing conversation

    const request = new MockRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: { creatorId: 'user1', participantId: 'user2' },
    });
    const response = await POST(request as any);

    expect(db.prepare().get).toHaveBeenCalledWith('user1', 'user2');
    expect(db.prepare().run).not.toHaveBeenCalled(); // No new inserts
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(existingConvo);
  });

  it('should return 400 if creatorId or participantId is missing', async () => {
    const request = new MockRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: { creatorId: 'user1' }, // Missing participantId
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Creator ID and participant ID are required' });
  });
});
