'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppUser, Vacation, VacationStatus, Surgeon, VacationAmount } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper to get DB client (uses standard client for RLS enforcement)
const getDb = async () => await createClient();

// --- User Functions ---

export async function findUserById(uid: string): Promise<AppUser | null> {
    try {
        const supabase = await getDb();
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
        const supabase = await getDb();
        const { data, error } = await supabase.from('users').select('*, password').ilike('username', username).single();
        if (error && error.code !== 'PGRST116') throw error; // Throw if it's a real error, not just no rows
        return data as AppUser | null;
    } catch (error) {
        console.error("findUserByUsername failed:", error);
        return null;
    }
}

export async function getProfileAndSync(uid: string, metadataUsername?: string): Promise<AppUser | null> {
    try {
        let user = await findUserById(uid);
        let oldUid: string | null = null;
        let finalUser: AppUser | null = user;

        // If not found by UID, try by username (lazy migration fallback)
        if (!user && metadataUsername) {
            console.log(`[AUTH DEBUG] User not found by UID ${uid}. Attempting fallback via username: ${metadataUsername}`);
            const legacyUser = await findUserByUsername(metadataUsername);
            if (legacyUser) {
                console.log(`[AUTH DEBUG] Legacy user found! Syncing UID ${legacyUser.uid} -> ${uid}`);
                oldUid = legacyUser.uid;
                finalUser = { ...legacyUser, uid };
            }
        }
        // PROACTIVE FIX: Even if user found by UID, if we have metadata, check if there's an old ID to clean up
        else if (user && metadataUsername) {
            const supabase = await getDb();
            const { data: legacyCandidate } = await supabase.from('users')
                .select('uid')
                .ilike('username', metadataUsername)
                .neq('uid', uid)
                .maybeSingle();

            if (legacyCandidate) {
                console.log(`[AUTH DEBUG] Orphean data detected for legacy ID: ${legacyCandidate.uid}. Merging to ${uid}`);
                oldUid = legacyCandidate.uid;
            }
        }

        if (oldUid) {
            const { createAdminClient } = await import('@/lib/supabase/admin');
            const supabaseAdmin = createAdminClient();

            console.log(`[AUTH DEBUG] Starting atomic DB sync for all tables (including messages)...`);
            const results = await Promise.all([
                supabaseAdmin.from('users').update({ uid: uid }).eq('uid', oldUid),
                supabaseAdmin.from('vacations').update({ userId: uid }).eq('userId', oldUid),
                supabaseAdmin.from('notifications').update({ userId: uid }).eq('userId', oldUid),
                supabaseAdmin.from('messages').update({ senderId: uid }).eq('senderId', oldUid),
                supabaseAdmin.from('messages').update({ receiverId: uid }).eq('receiverId', oldUid)
            ]);

            results.forEach((res, index) => {
                const tables = ['users', 'vacations', 'notifications', 'messages(sender)', 'messages(receiver)'];
                if (res.error) console.error(`[AUTH DEBUG] Sync error [${tables[index]}]:`, res.error.message);
                else console.log(`[AUTH DEBUG] Sync success [${tables[index]}]`);
            });
        }

        return finalUser;
    } catch (error) {
        console.error("getProfileAndSync failed:", error);
        return null;
    }
}

export async function addUser(user: AppUser): Promise<AppUser> {
    const supabase = await getDb();
    const { data, error } = await supabase.from('users').insert({ ...user }).select().single();
    if (error) throw error;
    return data as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
    const supabase = await getDb();
    const { data, error } = await supabase.from('users').select('uid, username, email, role, nom, prenom, fonction');
    if (error) throw error;
    return data as AppUser[];
}

export async function deleteUser(userId: string): Promise<void> {
    const supabase = await getDb();
    const { error } = await supabase.from('users').delete().eq('uid', userId);
    if (error) throw error;
}

// --- Vacation Functions ---

async function getVacationWithUser(vacationId: string): Promise<Vacation | null> {
    const supabase = await getDb();
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

    let query = (await getDb()).from('vacations').select('*, user:users(*)', { count: 'exact' });

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
    const supabase = await getDb();

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
    const supabase = await getDb();

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
    const supabase = await getDb();
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
    const supabase = await getDb();
    const newId = `${Date.now()}-${Math.random()}`;
    const newVacation = { ...vacation, id: newId };

    const { data, error } = await supabase.from('vacations').insert(newVacation).select().single();
    if (error) throw error;
    const result = await getVacationWithUser(newId);
    if (!result) throw new Error('Could not retrieve new vacation');
    return result;
}

export async function updateVacation(updatedVacation: Vacation): Promise<Vacation> {
    const supabase = await getDb();

    const { id, user: ignoredUser, ...updateData } = updatedVacation;
    const cleanUpdateData = { ...updateData };
    delete (cleanUpdateData as any).userId;

    const { data, error } = await supabase.from('vacations').update(cleanUpdateData).eq('id', id).select().single();
    if (error) {
        console.error("Supabase update error:", error);
        throw error;
    }
    const updated = await getVacationWithUser(id);
    if (!updated) throw new Error('Could not retrieve updated vacation');
    return updated;
}

export async function deleteVacation(vacationId: string): Promise<void> {
    const supabase = await getDb();
    const { error } = await supabase.from('vacations').delete().eq('id', vacationId);
    if (error) throw error;
}

export async function updateVacationStatus(vacationId: string, status: VacationStatus): Promise<Vacation> {
    const supabase = await getDb();

    const { data: existingVacation, error: existingVacationError } = await supabase.from('vacations').select('userId, patientName, status, date').eq('id', vacationId).single();

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
    const formattedDate = format(new Date(existingVacation.date), 'dd/MM/yyyy', { locale: fr });

    let statusText;
    if (status === 'Validée') statusText = 'validée ✅';
    else if (status === 'Refusée') statusText = 'refusée ❌';
    else statusText = 'remise en attente ⏳';

    const notificationMessage = `Votre vacation du ${formattedDate} (Patient: ${existingVacation.patientName}) a été ${statusText}.`;
    const notificationType = 'vacation_status_change';

    // Use admin client for notification creation (system operation)
    const supabaseAdmin = createAdminClient();
    const { error: notificationError } = await supabaseAdmin.from('notifications').insert({
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
    const supabase = await getDb();
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
    const supabase = await getDb();
    const { data, error } = await supabase.from('surgeons').select('*').order('name');
    if (error) throw error;
    return data as Surgeon[];
}

export async function addSurgeon(name: string): Promise<Surgeon> {
    const supabase = await getDb();
    const { data, error } = await supabase.from('surgeons').insert({ name }).select().single();
    if (error) throw error;
    return data as Surgeon;
}

export async function deleteSurgeon(id: number): Promise<void> {
    const supabase = await getDb();
    const { error } = await supabase.from('surgeons').delete().eq('id', id);
    if (error) throw error;
}

// --- Vacation Amount Functions ---

export async function getVacationAmounts(): Promise<VacationAmount[]> {
    const supabase = await getDb();
    const { data, error } = await supabase.from('vacation_amounts_full').select('*');
    if (error) throw error;
    return data as VacationAmount[];
}

export async function updateVacationAmounts(amounts: VacationAmount[]): Promise<void> {
    const supabase = await getDb();
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
    const supabase = await getDb();
    const { data, error } = await supabase.from('vacations').select('reason');
    if (error) {
        console.error("getVacationReasons failed:", error);
        return [];
    }
    if (!data) return [];

    const uniqueReasons = Array.from(new Set(data.map(v => v.reason ? v.reason.trim() : null))).filter(Boolean);
    return uniqueReasons as string[];
}
