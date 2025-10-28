import { getDb } from '../src/lib/db';

async function archivePreviousPayrollPeriod() {
  console.log('Starting the archival process for vacations before the current month...');
  const supabase = getDb();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // First day of the current month
  const firstDayOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1));

  // The cutoff date is the day before the current month started.
  const archiveCutoffDate = new Date(firstDayOfCurrentMonth);
  archiveCutoffDate.setUTCDate(archiveCutoffDate.getUTCDate() - 1);

  const endDateString = archiveCutoffDate.toISOString().split('T')[0];

  console.log(`Archiving all unarchived vacations up to and including ${endDateString}.`);

  try {
    const { data, error, count } = await supabase
      .from('vacations')
      .update({ isArchived: true })
      .lte('date', endDateString)   // Less than or equal to the end date
      .or('isArchived.is.null,isArchived.eq.false'); // Only update records that are not already archived

    if (error) {
      throw error;
    }

    console.log(`Successfully archived ${count ?? 0} vacation(s).`);

  } catch (error) {
    console.error('An error occurred during the archival process:', error);
    process.exit(1);
  }
}

archivePreviousPayrollPeriod();