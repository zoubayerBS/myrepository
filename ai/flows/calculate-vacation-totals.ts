
'use server';

/**
 * @fileOverview A flow that calculates suggested total vacation amounts per user for a given period from the database.
 *
 * - calculateVacationTotals - A function that calculates the total vacation amounts.
 * - CalculateVacationTotalsInput - The input type for the calculateVacationTotals function.
 * - CalculateVacationTotalsOutput - The return type for the calculateVacationTotals function.
 */

import { z } from 'zod';
import { db } from '@/lib/db'; // Using direct DB access

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
  const { userId, startDate, endDate } = input;

  try {
    // Dates need to be in ISO 8601 format for string comparison in SQLite.
    // Ensure the end date includes the entire day.
    const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

    const stmt = db.prepare(`
        SELECT SUM(amount) as totalAmount
        FROM vacations
        WHERE userId = ?
          AND status = 'Validée'
          AND date >= ?
          AND date <= ?
    `);
    
    const result = stmt.get(userId, startIso, endIso) as { totalAmount: number | null };
    
    return { totalAmount: result.totalAmount ?? 0 };

  } catch (error) {
    console.error("Error calculating from database:", error);
    throw new Error("Failed to calculate vacation totals from database.");
  }
}
