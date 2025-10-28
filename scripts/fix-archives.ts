import { getDb } from '../src/lib/db';

async function fixArchives() {
  const supabase = getDb();

  // Step 1: Un-archive all currently archived vacations
  console.log('Step 1: Un-archiving all existing archived vacations...');
  try {
    const { error: unarchiveError, count: unarchiveCount } = await supabase
      .from('vacations')
      .update({ isArchived: false })
      .eq('isArchived', true);

    if (unarchiveError) {
      throw new Error(`Failed to un-archive vacations: ${unarchiveError.message}`);
    }
    console.log(`Successfully un-archived ${unarchiveCount ?? 0} vacation(s).`);
  } catch (error) {
    console.error('An error occurred during the un-archival step:', error);
    process.exit(1);
  }

  // Step 2: Run the corrected archival logic
  console.log('\nStep 2: Re-archiving vacations based on the new logic (before current month)...');
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const firstDayOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const archiveCutoffDate = new Date(firstDayOfCurrentMonth);
    archiveCutoffDate.setUTCDate(archiveCutoffDate.getUTCDate() - 1);
    const endDateString = archiveCutoffDate.toISOString().split('T')[0];

    console.log(`Re-archiving all vacations up to and including ${endDateString}.`);

    const { error: archiveError, count: archiveCount } = await supabase
      .from('vacations')
      .update({ isArchived: true })
      .lte('date', endDateString)
      .or('isArchived.is.null,isArchived.eq.false'); // Only update records that are not already archived


    if (archiveError) {
      throw new Error(`Failed to re-archive vacations: ${archiveError.message}`);
    }
    console.log(`Successfully re-archived ${archiveCount ?? 0} vacation(s).`);
    console.log('\nArchive fix complete!');

  } catch (error) {
    console.error('An error occurred during the re-archival step:', error);
    process.exit(1);
  }
}

fixArchives();
