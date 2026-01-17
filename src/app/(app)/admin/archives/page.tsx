import { VacationsClient } from '@/components/dashboard/VacationsClient';
import type { AppUser, Vacation } from '@/types';
import { findArchivedVacations, getAllUsers } from '@/lib/local-data';
import { Suspense } from 'react';

export const revalidate = 0; // Disable caching

export default async function ArchivedVacationsPage({ searchParams }: { searchParams: Promise<any> }) {
    const sParams = await searchParams;
    // Fetch initial data on the server
    const data = await findArchivedVacations();
    const initialVacations: Vacation[] = data.vacations;
    const allUsers: AppUser[] = await getAllUsers();

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden">
            <VacationsClient
                initialVacations={initialVacations}
                allUsers={allUsers}
                isAdminView={true}
                archiveMode={true} // New prop to indicate this is the archive view
                searchParams={sParams}
            />
        </div>
    );
}
