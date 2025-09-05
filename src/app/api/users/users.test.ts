import { GET } from './route';
import { db } from '@/lib/db';

// Mock Request class for testing API routes
class MockRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      return {
        status: options?.status || 200,
        json: () => Promise.resolve(data), // Mock the .json() method on the returned object
      };
    }),
  },
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  db: {
    prepare: jest.fn().mockReturnThis(),
    all: jest.fn(),
  },
}));

describe('GET /api/users', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should return a list of users excluding the current user', async () => {
    const mockUsers = [
      { uid: 'user1', username: 'User One', email: 'user1@example.com' },
      { uid: 'user2', username: 'User Two', email: 'user2@example.com' },
    ];
    (db.prepare().all as jest.Mock).mockReturnValue(mockUsers);

    const request = new MockRequest('http://localhost/api/users?currentUserId=user1');
    const response = await GET(request as any);

    expect(db.prepare).toHaveBeenCalledWith('SELECT uid, username, email FROM users WHERE uid != ?');
    expect(db.prepare().all).toHaveBeenCalledWith('user1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockUsers);
  });

  it('should return 400 if currentUserId is missing', async () => {
    const request = new MockRequest('http://localhost/api/users');
    const response = await GET(request as any);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Current User ID is required' });
  });
});