'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { findVacationsByUserId } from '@/lib/local-data';
import type { Vacation, AppUser } from '@/types';
import { Loader2 } from 'lucide-react';
import { UserStats } from './UserStats';
import { VacationsClient } from './VacationsClient';
import { TotalCalculator } from './TotalCalculator';

export function DashboardContainer() {
  const { user, userData } = useAuth();
  const [vacations, setVacations] = useState<Vacation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchAllData = async () => {
        setLoading(true);
        try {
          const userVacations = await findVacationsByUserId(user.uid);
          setVacations(userVacations.vacations);
        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
          // Optionally, set an error state to show a message to the user
        } finally {
          setLoading(false);
        }
      };
      fetchAllData();
    } else {
      // If there's no user and auth is not loading, stop loading.
      if (!userData) setLoading(false);
    }
  }, [user, userData]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement des données du dashboard...</p>
      </div>
    );
  }

  if (!vacations || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <p className="mt-4 text-destructive">Impossible de charger les données du dashboard. Veuillez réessayer.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden">
      <UserStats userId={user.uid} />
      <div className="grid gap-8 md:grid-cols-3 mt-8">
        <div className="md:col-span-2">
          <VacationsClient
            initialVacations={vacations}
            isAdminView={false}
          />
        </div>
        <div className="md:col-span-1 pt-10">
          <TotalCalculator userId={user.uid} />
        </div>
      </div>
    </div>
  );
}
