import { GET } from './route';
import { getDb } from '@/lib/db';

// Mock Request class
class MockRequest {
  url: string;
  method: string;

  constructor(url: string, options: { method?: string } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
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
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
};

const mockSupabaseClient = {
    from: jest.fn(() => queryChainer),
};

jest.mock('@/lib/db', () => ({
    getDb: () => mockSupabaseClient,
}));


describe('GET /api/conversations/[conversationId]', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Chainable mocks
    queryChainer.select.mockReturnThis();
    queryChainer.eq.mockReturnThis();
    queryChainer.order.mockReturnThis();
    queryChainer.single.mockReturnThis();
  });

  it('should return messages for a given conversation', async () => {
    const mockMessages = [{ id: 'msg1', content: 'Hello' }];
    mockSupabaseClient.from.mockReturnValue({
        ...queryChainer,
        order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1');
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    expect(queryChainer.select).toHaveBeenCalledWith('*, sender:users!senderId(username)');
    expect(queryChainer.eq).toHaveBeenCalledWith('conversationId', 'convo1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockMessages);
  });

  it('should return an empty array if conversation exists but has no messages', async () => {
    // No messages found
    mockSupabaseClient.from.mockReturnValueOnce({
        ...queryChainer,
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    // Conversation found
    mockSupabaseClient.from.mockReturnValueOnce({
        ...queryChainer,
        single: jest.fn().mockResolvedValue({ data: {id: 'convo1'}, error: null }),
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1');
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it('should return 404 if conversation does not exist', async () => {
    // No messages found
    mockSupabaseClient.from.mockReturnValueOnce({
        ...queryChainer,
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    // Conversation not found
    mockSupabaseClient.from.mockReturnValueOnce({
        ...queryChainer,
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1');
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });
    
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Conversation not found' });
  });

  it('should handle database errors', async () => {
    mockSupabaseClient.from.mockReturnValue({
        ...queryChainer,
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
    });

    const request = new MockRequest('http://localhost/api/conversations/convo1');
    const response = await GET(request as any, { params: { conversationId: 'convo1' } });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch conversation' });
  });
});