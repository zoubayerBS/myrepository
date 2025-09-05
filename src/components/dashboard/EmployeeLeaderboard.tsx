
'use client';

import { useMemo } from 'react';
import { startOfMonth, startOfWeek, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';
import type { AppUser, Vacation } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

interface EmployeeLeaderboardProps {
  vacations: Vacation[]; // Should be pre-filtered for 'Validée' status
  users: AppUser[];
}

interface LeaderboardEntry {
  user: AppUser;
  count: number;
}

const getLeaderboard = (vacations: Vacation[], users: AppUser[], startDate: Date, endDate: Date): LeaderboardEntry[] => {
    const periodVacations = vacations.filter(v => {
        const vacationDate = new Date(v.date);
        return isWithinInterval(vacationDate, { start: startDate, end: endDate });
    });

    const userCounts = periodVacations.reduce((acc, v) => {
        acc[v.userId] = (acc[v.userId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return users
        .map(user => ({
            user,
            count: userCounts[user.uid] || 0,
        }))
        .filter(entry => entry.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
};


export function EmployeeLeaderboard({ vacations, users }: EmployeeLeaderboardProps) {
  const now = new Date();

  const monthlyLeaderboard = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return getLeaderboard(vacations, users, start, end);
  }, [vacations, users]);

  const weeklyLeaderboard = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return getLeaderboard(vacations, users, start, end);
  }, [vacations, users]);
  
  const LeaderboardList = ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
      if (leaderboard.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée pour cette période.</p>;
      }
      return (
        <ul className="space-y-3">
          {leaderboard.map((entry, index) => (
            <li key={entry.user.uid} className="flex items-center gap-4">
               <div className="font-bold text-lg text-primary w-4">{index + 1}.</div>
              <Avatar className="h-9 w-9">
                <AvatarImage src={`/avatars/${entry.user.username}.png`} alt={entry.user.username} />
                <AvatarFallback>{(entry.user.username?.[0] ?? '').toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">{entry.user.username}</p>
                 <p className="text-xs text-muted-foreground">
                  {entry.count} {entry.count > 1 ? 'vacations' : 'vacation'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )
  }

  return (
    <Tabs defaultValue="monthly" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="monthly">Mois</TabsTrigger>
        <TabsTrigger value="weekly">Semaine</TabsTrigger>
      </TabsList>
      <TabsContent value="monthly">
        <Card>
            <CardContent className="pt-6">
                <LeaderboardList leaderboard={monthlyLeaderboard} />
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="weekly">
         <Card>
            <CardContent className="pt-6">
                 <LeaderboardList leaderboard={weeklyLeaderboard} />
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
