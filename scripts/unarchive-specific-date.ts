
import { getDb } from '../src/lib/db';

async function unarchiveSpecificDate() {
  console.log('Starting the un-archival process for a specific date...');
  const supabase = getDb();
  
  // The date of the vacation(s) to unarchive
  const dateToUnarchive = '2025-09-26';

  console.log(`Attempting to unarchive all vacations for the date: ${dateToUnarchive}`);

  try {
    const { data, error, count } = await supabase
      .from('vacations')
      .update({ isArchived: false })
      .eq('date', dateToUnarchive) // Find all vacations on this specific date
      .eq('isArchived', true);      // Only select those that are currently archived

    if (error) {
      throw error;
    }

    console.log(`Successfully unarchived ${count ?? 0} vacation(s) for ${dateToUnarchive}.`);

  } catch (error) {
    console.error('An error occurred during the un-archival process:', error);
    process.exit(1);
  }
}

unarchiveSpecificDate();
