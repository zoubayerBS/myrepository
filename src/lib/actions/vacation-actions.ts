'use server';

import { revalidatePath } from 'next/cache';
import { findPendingPreviousMonthVacations, findAllVacations, findVacationsByUserId } from '@/lib/local-data';
import type { Vacation } from '@/types';

export async function getPendingPreviousMonthVacations(filters: {
    startDate?: string;
    endDate?: string;
    userFilter?: string;
    typeFilter?: string;
    searchQuery?: string;
} = {}) {
  try {
    const pendingVacations = await findPendingPreviousMonthVacations(filters);
    return pendingVacations;
  } catch (error) {
    console.error('Error fetching pending previous month vacations:', error);
    // Optionally, you could return an empty array or a specific error object
    // For now, re-throwing the error to be handled by the caller or a boundary
    throw new Error('Could not fetch pending vacations.');
  }
}

export async function findAllVacationsAction(options: { 
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
} = {}): Promise<{ vacations: Vacation[], total: number }> {
    return await findAllVacations(options);
}

export async function findVacationsByUserIdAction(
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
  } = {}
): Promise<{ vacations: Vacation[], total: number }> {
    return await findVacationsByUserId(userId, options);
}
