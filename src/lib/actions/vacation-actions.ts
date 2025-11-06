'use server';

import { revalidatePath } from 'next/cache';
import { findPendingPreviousMonthVacations } from '@/lib/local-data';

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