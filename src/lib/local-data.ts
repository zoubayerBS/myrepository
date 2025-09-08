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
    const { data, error } = await supabase.from('users').select('uid, username, email, role, nom, prenom');
    if (error) throw error;
    return data as AppUser[];
}

// --- Vacation Functions ---

async function getVacationWithUser(vacationId: string): Promise<Vacation | null> {
    const { data: vacationData, error: vacationError } = await supabase.from('vacations').select('*, user:users(*)').eq('id', vacationId).single();
    if (vacationError && vacationError.code !== 'PGRST116') throw vacationError;
    return vacationData as Vacation | null;
}

export async function findAllVacations(): Promise<Vacation[]> {
    const { data, error } = await supabase.from('vacations').select('*, user:users(*)').order('date', { ascending: false });
    if (error) throw error;
    return data as Vacation[];
}

export async function findVacationsByUserId(userId: string): Promise<Vacation[]> {
    const { data, error } = await supabase.from('vacations').select('*').eq('userId', userId).order('date', { ascending: false });
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
    const { data, error } = await supabase.from('vacations').update(updatedVacation).eq('id', updatedVacation.id).select().single();
    if (error) throw error;
    const updated = await getVacationWithUser(updatedVacation.id);
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
