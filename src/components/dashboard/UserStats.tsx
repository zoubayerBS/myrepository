'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { findVacationsByUserId } from '@/lib/local-data';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Hourglass, HandCoins, CheckCheck } from 'lucide-react';
import type { Vacation } from '@/types';

interface UserStatsProps {
    userId: string;
}

export function UserStats({ userId: initialUserId }: UserStatsProps) {
    const { user } = useAuth();
    const [userId, setUserId] = useState(initialUserId);
    const [stats, setStats] = useState({
        validatedAmount: 0,
        pending: 0,
        totalValidated: 0,
        monthlyValidated: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setUserId(user.uid);
        }
    }, [user]);

    useEffect(() => {
        if (!userId) return;

        const fetchAndComputeStats = async () => {
            setLoading(true);
            const allVacations = await findVacationsByUserId(userId);
            const now = new Date();
            
            const startOfCurrentMonth = startOfMonth(now);
            const endOfCurrentMonth = endOfMonth(now);

            // 1. Total pending vacations (not tied to a period)
            const totalPending = allVacations.filter(v => v.status === 'En attente').length;

            // 2. Validated vacations (total and this month)
            const allValidatedVacations = allVacations.filter(v => v.status === 'Validée');
            const totalValidatedCount = allValidatedVacations.length;
            
            const monthlyValidatedVacations = allValidatedVacations.filter(v => 
                isWithinInterval(new Date(v.date), { start: startOfCurrentMonth, end: endOfCurrentMonth })
            );
            const monthlyValidatedCount = monthlyValidatedVacations.length;

            // 3. Validated amount for the current month
            const validatedAmountMonthly = monthlyValidatedVacations.reduce((sum, v) => sum + v.amount, 0);

            setStats({ 
                validatedAmount: validatedAmountMonthly, 
                pending: totalPending, 
                totalValidated: totalValidatedCount,
                monthlyValidated: monthlyValidatedCount
            });
            setLoading(false);
        };

        fetchAndComputeStats();
    }, [userId]);

    if (!user || loading) {
        // Skeleton loader
        return (
             <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card><CardHeader><CardTitle>...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
                <Card><CardHeader><CardTitle>...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
                <Card><CardHeader><CardTitle>...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vacations Validées</CardTitle>
                    <CheckCheck className="h-6 w-6 text-blue-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold">{stats.monthlyValidated}</div>
                            <p className="text-xs text-muted-foreground">ce mois-ci</p>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.totalValidated}</div>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Montant Validé (ce mois)</CardTitle>
                    <HandCoins className="h-6 w-6 text-green-600 animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.validatedAmount.toFixed(2)} DT</div>
                    <p className="text-xs text-muted-foreground">Gains validés ce mois-ci</p>
                </CardContent>
            </Card>
            <Card >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Demandes en Attente</CardTitle>
                    <Hourglass className="h-6 w-6 text-yellow-500 animate-spin" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <p className="text-xs text-muted-foreground">Total des vacations non traitées</p>
                </CardContent>
            </Card>
        </div>
    );
}