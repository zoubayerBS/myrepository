import { findVacationsByUserId, findAllVacations, findArchivedVacations } from './local-data';
import { getDb } from './db';

const queryChainer = {
  select: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  or: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  lt: jest.fn(),
  ilike: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
};

const mockSupabaseClient = {
  from: jest.fn(() => queryChainer),
};

// Make all methods on the chainer return `this` for chaining, except for range
Object.keys(queryChainer).forEach(key => {
  const method = key as keyof typeof queryChainer;
  if (method !== 'range') {
    queryChainer[method].mockReturnThis();
  }
});

jest.mock('./db', () => ({
  getDb: () => mockSupabaseClient,
}));

describe('local-data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default success response
    queryChainer.range.mockResolvedValue({ data: [], error: null, count: 0 });
  });

  describe('findVacationsByUserId', () => {
    it('should apply default filter for user view (current month or pending)', async () => {
      await findVacationsByUserId('user123', { userDefaultView: true });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vacations');
      expect(queryChainer.eq).toHaveBeenCalledWith('userId', 'user123');

      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const expectedOrQuery = `status.eq.En attente,and(date.gte.${firstDayOfMonth},date.lte.${lastDayOfMonth})`;

      expect(queryChainer.or).toHaveBeenCalledWith(expectedOrQuery);
      expect(queryChainer.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(queryChainer.range).toHaveBeenCalledWith(0, 9);
    });

    it('should filter by multiple statuses if provided', async () => {
      await findVacationsByUserId('user123', { status: 'Validée,Refusée' });

      expect(queryChainer.in).toHaveBeenCalledWith('status', ['Validée', 'Refusée']);
      expect(queryChainer.ilike).not.toHaveBeenCalled();
    });

    it('should filter by a single status using ilike', async () => {
      await findVacationsByUserId('user123', { status: 'Validée' });
      
      expect(queryChainer.ilike).toHaveBeenCalledWith('status', '%Validée%');
      expect(queryChainer.in).not.toHaveBeenCalled();
    });
  });

  describe('findAllVacations', () => {
    it('should filter by multiple statuses if provided', async () => {
      await findAllVacations({ status: 'Validée,Refusée' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vacations');
      expect(queryChainer.in).toHaveBeenCalledWith('status', ['Validée', 'Refusée']);
      expect(queryChainer.ilike).not.toHaveBeenCalled();
    });

    it('should filter by a single status using ilike', async () => {
      await findAllVacations({ status: 'Refusée' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vacations');
      expect(queryChainer.ilike).toHaveBeenCalledWith('status', '%Refusée%');
      expect(queryChainer.in).not.toHaveBeenCalled();
    });
  });

  describe('findArchivedVacations', () => {
    it('should filter by multiple statuses if provided', async () => {
      await findArchivedVacations({ status: 'Validée,Refusée' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vacations');
      expect(queryChainer.eq).toHaveBeenCalledWith('isArchived', true);
      expect(queryChainer.in).toHaveBeenCalledWith('status', ['Validée', 'Refusée']);
      expect(queryChainer.ilike).not.toHaveBeenCalled();
    });

    it('should filter by a single status using ilike', async () => {
        await findArchivedVacations({ status: 'Validée' });
  
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('vacations');
        expect(queryChainer.eq).toHaveBeenCalledWith('isArchived', true);
        expect(queryChainer.ilike).toHaveBeenCalledWith('status', '%Validée%');
        expect(queryChainer.in).not.toHaveBeenCalled();
      });
  });
});