'use server';

import { getDb } from './db';
import type { AppUser, Vacation, VacationStatus, Surgeon, VacationAmount } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const supabase = getDb();

// --- User Functions ---

export async function findUserById(uid: string): Promise<AppUser | null> {
    try {
        const { data, error } = await supabase.from('users').select('*, password').eq('uid', uid).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data as AppUser | null;
    } catch (error) {
        console.error("findUserById failed:", error);
        return null;
    }
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
    try {
        const { data, error } = await supabase.from('users').select('*, password').ilike('username', username).single();
        if (error && error.code !== 'PGRST116') throw error; // Throw if it's a real error, not just no rows
        return data as AppUser | null;
    } catch (error) {
        console.error("findUserByUsername failed:", error);
        return null;
    }
}

export async function addUser(user: AppUser): Promise<AppUser> {
    const { data, error } = await supabase.from('users').insert({ ...user }).select().single();
    if (error) throw error;
    return data as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
    const { data, error } = await supabase.from('users').select('uid, username, email, role, nom, prenom, fonction');
    if (error) throw error;
    return data as AppUser[];
}

export async function deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('uid', userId);
    if (error) throw error;
}

// --- Vacation Functions ---

async function getVacationWithUser(vacationId: string): Promise<Vacation | null> {
    const { data: vacationData, error: vacationError } = await supabase.from('vacations').select('*, user:users(*)').eq('id', vacationId).single();
    if (vacationError && vacationError.code !== 'PGRST116') throw vacationError;
    return vacationData as Vacation | null;
}

export async function findAllVacations(
    options: { 
        includeArchived?: boolean; 
        page?: number; 
        limit?: number;
        status?: string;
        type?: string;
        motif?: string;
        userFilter?: string;
        startDate?: string;
        endDate?: string;
        searchQuery?: string;
    } = {}
): Promise<{ vacations: Vacation[], total: number }> {
    const { includeArchived = false, page = 1, limit = 10, status, type, motif, userFilter, startDate, endDate, searchQuery } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('vacations').select('*, user:users(*)', { count: 'exact' });

    if (!includeArchived) {
        query = query.or('isArchived.is.null,isArchived.eq.false');
    }
    if (userFilter && userFilter !== 'all') {
        query = query.eq('userId', userFilter);
    }
    if (status && status !== 'all') {
      const statuses = status.split(',');
      if (statuses.length > 1) {
        query = query.in('status', statuses);
      } else {
        query = query.ilike('status', `%${status}%`);
      }
    }
    if (type && type !== 'all') {
      query = query.ilike('type', `%${type}%`);
    }
    if (motif && motif !== 'all') {
      query = query.ilike('reason', `%${motif}%`);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (searchQuery) {
        const orQuery = [
            `patientName.ilike.%${searchQuery}%`,
            `matricule.ilike.%${searchQuery}%`,
            `surgeon.ilike.%${searchQuery}%`,
            `operation.ilike.%${searchQuery}%`,
            `reason.ilike.%${searchQuery}%`,
            `type.ilike.%${searchQuery}%`,
            `user.username.ilike.%${searchQuery}%`,
            `user.nom.ilike.%${searchQuery}%`,
            `user.prenom.ilike.%${searchQuery}%`
        ].join(',');
        query = query.or(orQuery, { referencedTable: 'users' });
    }
    
    const { data, error, count } = await query.order('date', { ascending: false }).range(from, to);
    
    if (error) throw error;
    
    return { vacations: data as Vacation[], total: count ?? 0 };
}

export async function findArchivedVacations(
    options: { 
        page?: number; 
        limit?: number;
        status?: string;
        type?: string;
        motif?: string;
        userFilter?: string;
        startDate?: string;
        endDate?: string;
        searchQuery?: string;
    } = {}
): Promise<{ vacations: Vacation[], total: number }> {
    const { page = 1, limit = 10, status, type, motif, userFilter, startDate, endDate, searchQuery } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('vacations')
        .select('*, user:users(*)', { count: 'exact' })
        .eq('isArchived', true);

    if (userFilter && userFilter !== 'all') {
        query = query.eq('userId', userFilter);
    }
    if (status && status !== 'all') {
      const statuses = status.split(',');
      if (statuses.length > 1) {
        query = query.in('status', statuses);
      } else {
        query = query.ilike('status', `%${status}%`);
      }
    }
    if (type && type !== 'all') {
      query = query.ilike('type', `%${type}%`);
    }
    if (motif && motif !== 'all') {
      query = query.ilike('reason', `%${motif}%`);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (searchQuery) {
        const orQuery = [
            `patientName.ilike.%${searchQuery}%`,
            `matricule.ilike.%${searchQuery}%`,
            `surgeon.ilike.%${searchQuery}%`,
            `operation.ilike.%${searchQuery}%`,
            `reason.ilike.%${searchQuery}%`,
            `type.ilike.%${searchQuery}%`,
            `user.username.ilike.%${searchQuery}%`,
            `user.nom.ilike.%${searchQuery}%`,
            `user.prenom.ilike.%${searchQuery}%`
        ].join(',');
        query = query.or(orQuery, { referencedTable: 'users' });
    }

    const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(from, to);

    if (error) throw error;
    return { vacations: data as Vacation[], total: count ?? 0 };
}

export async function findVacationsByUserId(
  userId: string, 
  options: { 
    page?: number; 
    limit?: number;
    status?: string;
    type?: string;
    motif?: string;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    userDefaultView?: boolean;
  } = {}
): Promise<{ vacations: Vacation[], total: number }> {
    const { page = 1, limit = 10, status, type, motif, startDate, endDate, searchQuery, userDefaultView = false } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('vacations')
        .select('*, user:users(*)', { count: 'exact' })
        .eq('userId', userId);

    if (userDefaultView) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
        query = query.or(`status.eq.En attente,and(date.gte.${firstDayOfMonth},date.lte.${lastDayOfMonth})`);
    } else {
        if (status && status !== 'all') {
          const statuses = status.split(',');
          if (statuses.length > 1) {
            query = query.in('status', statuses);
          } else {
            query = query.ilike('status', `%${status}%`);
          }
        }
        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }
    }

    if (type && type !== 'all') {
      query = query.ilike('type', `%${type}%`);
    }
    if (motif && motif !== 'all') {
      query = query.ilike('reason', `%${motif}%`);
    }
    if (searchQuery) {
      const orQuery = [
        `patientName.ilike.%${searchQuery}%`,
        `matricule.ilike.%${searchQuery}%`,
        `surgeon.ilike.%${searchQuery}%`,
        `operation.ilike.%${searchQuery}%`,
        `reason.ilike.%${searchQuery}%`,
        `type.ilike.%${searchQuery}%`
      ].join(',');
      query = query.or(orQuery);
    }

    const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("findVacationsByUserId query error:", error);
        throw error;
    }
    return { vacations: data as Vacation[], total: count ?? 0 };
}

export async function findPendingPreviousMonthVacations(filters: {
    startDate?: string;
    endDate?: string;
    userFilter?: string;
    typeFilter?: string;
    searchQuery?: string;
} = {}): Promise<Vacation[]> {
    const { startDate, endDate, userFilter, typeFilter, searchQuery } = filters;
    let query = supabase
        .from('vacations')
        .select('*, user:users(*)')
        .eq('status', 'En attente');

    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    query = query.lt('date', firstDayOfCurrentMonth);

    if (startDate) {
        query = query.gte('date', startDate);
    }
    if (endDate) {
        query = query.lte('date', endDate);
    }
    if (userFilter && userFilter !== 'all') {
        query = query.eq('userId', userFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
    }
    if (searchQuery) {
        const orQuery = [
            `patientName.ilike.%${searchQuery}%`,
            `matricule.ilike.%${searchQuery}%`,
            `surgeon.ilike.%${searchQuery}%`,
            `operation.ilike.%${searchQuery}%`,
            `reason.ilike.%${searchQuery}%`,
            `type.ilike.%${searchQuery}%`,
            `user.username.ilike.%${searchQuery}%`,
            `user.nom.ilike.%${searchQuery}%`,
            `user.prenom.ilike.%${searchQuery}%`,
        ].join(',');
        query = query.or(orQuery, { referencedTable: 'users' });
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw error;
    return data as Vacation[];
}


export async function addVacation(vacation: Omit<Vacation, 'id'>): Promise<Vacation> {
    const newId = `${Date.now()}-${Math.random()}`;
    const newVacation = { ...vacation, id: newId };
    const { data, error } = await supabase.from('vacations').insert(newVacation).select().single();
    if (error) throw error;
    const result = await getVacationWithUser(newId);
    if (!result) throw new Error('Could not retrieve new vacation');
    return result;
}

export async function updateVacation(updatedVacation: Vacation): Promise<Vacation> {
    const { id, user, ...updateData } = updatedVacation;
    const { data, error } = await supabase.from('vacations').update(updateData).eq('id', id).select().single();
    if (error) {
        console.error("Supabase update error:", error);
        throw error;
    }
    const updated = await getVacationWithUser(id);
    if(!updated) throw new Error('Could not retrieve updated vacation');
    return updated;
}

export async function deleteVacation(vacationId: string): Promise<void> {
    const { error } = await supabase.from('vacations').delete().eq('id', vacationId);
    if (error) throw error;
}

export async function updateVacationStatus(vacationId: string, status: VacationStatus): Promise<Vacation> {
    const { data: existingVacation, error: existingVacationError } = await supabase.from('vacations').select('userId, patientName, status').eq('id', vacationId).single();

    if (existingVacationError && existingVacationError.code !== 'PGRST116') throw existingVacationError;
    if (!existingVacation) {
        throw new Error('Vacation not found');
    }

    const { error: updateError } = await supabase.from('vacations').update({ status }).eq('id', vacationId);
    if (updateError) throw updateError;

    const updatedVacation = await getVacationWithUser(vacationId);
    if (!updatedVacation) {
        throw new Error('Failed to retrieve vacation after status update');
    }

    // --- Create Notification ---
    const notificationId = uuidv4();
    const notificationMessage = `Votre demande de vacation pour ${existingVacation.patientName} a été ${status === 'Validée' ? 'validée' : 'refusée'}.`;
    const notificationType = 'vacation_status_change';

    const { error: notificationError } = await supabase.from('notifications').insert({
        id: notificationId,
        userId: existingVacation.userId,
        type: notificationType,
        message: notificationMessage,
        relatedId: vacationId,
        read: 0,
        createdAt: new Date().toISOString()
    });

    if (notificationError) throw notificationError;

    return updatedVacation;
}

export async function updateVacationArchivedStatus(vacationId: string, isArchived: boolean): Promise<Vacation> {
    const { error: updateError } = await supabase.from('vacations').update({ isArchived }).eq('id', vacationId);
    if (updateError) throw updateError;

    const updatedVacation = await getVacationWithUser(vacationId);
    if (!updatedVacation) {
        throw new Error('Failed to retrieve vacation after archive status update');
    }
    return updatedVacation;
}



// --- Surgeon Functions ---

export async function getAllSurgeons(): Promise<Surgeon[]> {
    const { data, error } = await supabase.from('surgeons').select('*').order('name');
    if (error) throw error;
    return data as Surgeon[];
}

export async function addSurgeon(name: string): Promise<Surgeon> {
    const { data, error } = await supabase.from('surgeons').insert({ name }).select().single();
    if (error) throw error;
    return data as Surgeon;
}

export async function deleteSurgeon(id: number): Promise<void> {
    const { error } = await supabase.from('surgeons').delete().eq('id', id);
    if (error) throw error;
}

// --- Vacation Amount Functions ---

export async function getVacationAmounts(): Promise<VacationAmount[]> {
    const { data, error } = await supabase.from('vacation_amounts_full').select('*');
    if (error) throw error;
    return data as VacationAmount[];
}

export async function updateVacationAmounts(amounts: VacationAmount[]): Promise<void> {
    const { error } = await supabase.from('vacation_amounts_full').upsert(amounts);
    if (error) throw error;
}

// --- Settings Functions ---

export async function getSettings(): Promise<VacationAmount[]> {
    return getVacationAmounts();
}

export async function updateSettings(amounts: VacationAmount[]): Promise<void> {
    return updateVacationAmounts(amounts);
}

// --- Vacation Reason Functions ---
export async function getVacationReasons(): Promise<string[]> {
    const { data, error } = await supabase.from('vacations').select('reason');
    if (error) {
        console.error("getVacationReasons failed:", error);
        return [];
    }
    if (!data) return [];
    
    const uniqueReasons = Array.from(new Set(data.map(v => v.reason ? v.reason.trim() : null))).filter(Boolean);
    return uniqueReasons as string[];
}
