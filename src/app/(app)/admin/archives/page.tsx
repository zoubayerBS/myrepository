import { VacationsClient } from '@/components/dashboard/VacationsClient';
import type { AppUser, Vacation } from '@/types';
import { findArchivedVacations, getAllUsers } from '@/lib/local-data';

export const revalidate = 0; // Disable caching

export default async function ArchivedVacationsPage() {
    const placeholderUser: AppUser = { uid: 'loading', username: 'loading', role: 'admin', email: '' };
    
    // Fetch initial data on the server
    const initialVacations: Vacation[] = await findArchivedVacations();
    const allUsers: AppUser[] = await getAllUsers();

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden">
            <VacationsClient 
                currentUser={placeholderUser} // This will be replaced by auth context on client
                initialVacations={initialVacations}
                allUsers={allUsers}
                isAdminView={true}
                archiveMode={true} // New prop to indicate this is the archive view
            />
        </div>
    );
}
