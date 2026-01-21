'use server';

/**
 * @fileOverview A flow that calculates suggested total vacation amounts per user for a given period from the database.
 *
 * - calculateVacationTotals - A function that calculates the total vacation amounts.
 * - CalculateVacationTotalsInput - The input type for the calculateVacationTotals function.
 * - CalculateVacationTotalsOutput - The return type for the calculateVacationTotals function.
 */

import { z } from 'zod';
import { getDb } from '@/lib/db'; // Using direct DB access

const CalculateVacationTotalsInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  startDate: z.string().describe('The start date of the period (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the period (YYYY-MM-DD).'),
});

export type CalculateVacationTotalsInput = z.infer<typeof CalculateVacationTotalsInputSchema>;

const CalculateVacationTotalsOutputSchema = z.object({
  totalAmount: z.number().describe('The total vacation amount for the user in the given period.'),
});

export type CalculateVacationTotalsOutput = z.infer<typeof CalculateVacationTotalsOutputSchema>;

export async function calculateVacationTotals(input: CalculateVacationTotalsInput): Promise<CalculateVacationTotalsOutput> {
  const supabase = await getDb();
  const { userId, startDate, endDate } = input;

  try {
    const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

    const { data, error } = await supabase
      .from('vacations')
      .select('amount')
      .eq('userId', userId)
      .eq('status', 'Validée')
      .gte('date', startIso)
      .lte('date', endIso);

    if (error) throw error;

    const totalAmount = data.reduce((sum, record) => sum + record.amount, 0);

    return { totalAmount: totalAmount ?? 0 };

  } catch (error) {
    console.error("Error calculating from database:", error);
    throw new Error("Failed to calculate vacation totals from database.");
  }
}