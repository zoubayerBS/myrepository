import { VacationsClient } from '@/components/dashboard/VacationsClient';
import { TotalCalculator } from '@/components/dashboard/TotalCalculator';
import { UserStats } from '@/components/dashboard/UserStats';
import type { AppUser } from '@/types';
import { findVacationsByUserId } from '@/lib/local-data';


export const revalidate = 0; // Disable caching


// This page is now protected by the AppLayout, which checks for a user session.
export default async function DashboardPage() {
    // The user information will be available on the client-side through the useAuth hook.
    // We pass empty initial vacations and let the client handle fetching from the local data source.
    
    const placeholderUser: AppUser = { uid: 'loading', username: 'loading', role: 'user', email: '' };

    return (
    <div className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden">
        <UserStats userId="" />
        <div className="grid gap-8 md:grid-cols-3 mt-8">
            <div className="md:col-span-2">
                <VacationsClient 
                currentUser={placeholderUser}
                initialVacations={[]} // Client will fetch its own data
                isAdminView={false}
                />
            </div>
            <div className="md:col-span-1 pt-10">
            {/* The client will render this with the correct user ID */}
            <TotalCalculator userId="" />
            </div>
        </div>
    </div>
  );
}