import { GET, POST } from './route';
import { getDb } from '@/lib/db';

// Mock Request class
class MockRequest {
  url: string;
  method: string;
  _json: any;

  constructor(url: string, options: { method?: string; body?: any } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    if (options.body) {
      this._json = options.body;
    }
  }

  json() {
    return Promise.resolve(this._json);
  }

  get searchParams() {
    return new URL(this.url).searchParams;
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

// Mock Supabase
const queryChainer = {
    select: jest.fn(),
    insert: jest.fn(),
    or: jest.fn(),
    single: jest.fn(),
};

const mockSupabaseClient = {
    from: jest.fn(() => queryChainer),
    rpc: jest.fn(),
};

jest.mock('@/lib/db', () => ({
    getDb: () => mockSupabaseClient,
}));


// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-v4'),
}));


describe('Conversations API', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Chainable mocks
    queryChainer.select.mockReturnThis();
    queryChainer.insert.mockReturnThis();
    queryChainer.or.mockReturnThis();
  });

  describe('GET /api/conversations', () => {
    it('should return conversations for a user', async () => {
      const mockConversations = [{ id: 'convo1', participantName: 'Test User' }];
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockConversations, error: null });

      const request = new MockRequest('http://localhost/api/conversations?userId=user1');
      const response = await GET(request as any);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_conversations_with_details', { user_id_param: 'user1' });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(mockConversations);
    });

    it('should return 400 if userId is missing', async () => {
      const request = new MockRequest('http://localhost/api/conversations');
      const response = await GET(request as any);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: 'User ID is required' });
      expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();
    });

    it('should handle errors from the database', async () => {
        mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: new Error('DB Error') });
  
        const request = new MockRequest('http://localhost/api/conversations?userId=user1');
        const response = await GET(request as any);
  
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch conversations' });
    });
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation', async () => {
        // No existing conversation
        queryChainer.single.mockResolvedValueOnce({ data: null, error: null });
        // Mock for insert
        const newConvo = { id: 'mock-uuid-v4' };
        queryChainer.single.mockResolvedValueOnce({ data: newConvo, error: null });
        // Mock for getting other participant's username
        const otherUser = { username: 'Participant 2' };
        // This is a new chain for the second `from` call
        const userQueryChainer = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: otherUser, error: null }) };
        mockSupabaseClient.from.mockReturnValueOnce(queryChainer).mockReturnValueOnce(userQueryChainer);


        const request = new MockRequest('http://localhost/api/conversations', {
            method: 'POST',
            body: { participant1Id: 'user1', participant2Id: 'user2' },
        });

        const response = await POST(request as any);

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations');
        expect(queryChainer.or).toHaveBeenCalledWith(`(participant1Id.eq.user1,participant2Id.eq.user2),(participant1Id.eq.user2,participant2Id.eq.user1)`);
        expect(queryChainer.insert).toHaveBeenCalled();
        expect(response.status).toBe(200); // The route returns 200 on success now
        const responseJson = await response.json();
        expect(responseJson.id).toEqual(newConvo.id);
        expect(responseJson.otherParticipantName).toEqual(otherUser.username);
    });

    it('should return existing conversation if one exists', async () => {
        const existingConvo = { id: 'convo-exists' };
        queryChainer.single.mockResolvedValue({ data: existingConvo, error: null });

        const request = new MockRequest('http://localhost/api/conversations', {
            method: 'POST',
            body: { participant1Id: 'user1', participant2Id: 'user2' },
        });

        const response = await POST(request as any);

        expect(queryChainer.single).toHaveBeenCalled();
        expect(queryChainer.insert).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(existingConvo);
    });

    it('should return 400 if participant IDs are missing', async () => {
        const request = new MockRequest('http://localhost/api/conversations', {
            method: 'POST',
            body: { participant1Id: 'user1' },
        });

        const response = await POST(request as any);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: 'Both participant IDs are required' });
    });
  });
});