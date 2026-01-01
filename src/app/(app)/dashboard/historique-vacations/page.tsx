import { VacationsClient } from '@/components/dashboard/VacationsClient';
import type { AppUser } from '@/types';

export const revalidate = 0; // Disable caching

export default async function HistoriqueVacationsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden">
            <VacationsClient
                initialVacations={[]}
                isAdminView={false}
                historyMode={true}
            />
        </div>
    );
}
