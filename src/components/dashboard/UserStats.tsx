
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { findVacationsByUserId } from '@/lib/local-data';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Hourglass } from 'lucide-react';
import type { Vacation } from '@/types';

interface UserStatsProps {
    userId: string;
}

export function UserStats({ userId: initialUserId }: UserStatsProps) {
    const { user } = useAuth();
    const [userId, setUserId] = useState(initialUserId);
    const [stats, setStats] = useState({
        total: 0,
        validatedAmount: 0,
        pending: 0,
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
            const vacations = await findVacationsByUserId(userId);
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);

            const monthlyVacations = vacations.filter(v => 
                isWithinInterval(new Date(v.date), { start, end })
            );

            const total = monthlyVacations.length;
            const validatedAmount = monthlyVacations
                .filter(v => v.status === 'Validée')
                .reduce((sum, v) => sum + v.amount, 0);
            const pending = monthlyVacations.filter(v => v.status === 'En attente').length;

            setStats({ total, validatedAmount, pending });
            setLoading(false);
        };

        fetchAndComputeStats();
    }, [userId]);

    if (!user || loading) {
        // You can return a skeleton loader here if you prefer
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
                    <CardTitle className="text-sm font-medium">Vacations (ce mois)</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Total de déclarations ce mois-ci</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Montant Validé (ce mois)</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.validatedAmount.toFixed(2)} DT</div>
                    <p className="text-xs text-muted-foreground">Gains validés ce mois-ci</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Demandes en Attente</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <p className="text-xs text-muted-foreground">Déclarations non encore traitées</p>
                </CardContent>
            </Card>
        </div>
    );
}
