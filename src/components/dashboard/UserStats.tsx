'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { findVacationsByUserId } from '@/lib/local-data';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Hourglass, HandCoins, CheckCheck, TrendingUp, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vacation } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface UserStatsProps {
    userId: string;
    refreshKey?: number;
}

const containerVars = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
} as const;

export function UserStats({ userId, refreshKey }: UserStatsProps) {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        validatedAmount: 0,
        pending: 0,
        totalValidated: 0,
        monthlyValidated: 0,
        totalValidatedAmountGlobal: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchAndComputeStats = async (isInitial = false) => {
            if (isInitial) setLoading(true);
            const response = await fetch(`/api/vacations?userId=${userId}&limit=9999&t=${Date.now()}`);
            if (!response.ok) {
                if (isInitial) setLoading(false);
                return;
            }
            const { vacations: allVacations } = await response.json();
            const now = new Date();

            const startOfCurrentMonth = startOfMonth(now);
            const endOfCurrentMonth = endOfMonth(now);

            const safeVacations = (allVacations || []) as Vacation[];
            const totalPending = safeVacations.filter((v: Vacation) => v?.status === 'En attente').length;
            const allValidatedVacations = safeVacations.filter((v: Vacation) => v?.status === 'Validée');
            const totalValidatedCount = allValidatedVacations.length;

            const monthlyValidatedVacations = allValidatedVacations.filter((v: Vacation) =>
                v?.date && isWithinInterval(new Date(v.date), { start: startOfCurrentMonth, end: endOfCurrentMonth })
            );
            const monthlyValidatedCount = monthlyValidatedVacations.length;
            const validatedAmountMonthly = monthlyValidatedVacations.reduce((sum: number, v: Vacation) => sum + (v?.amount || 0), 0);
            const totalValidatedAmountGlobal = allValidatedVacations.reduce((sum: number, v: Vacation) => sum + (v?.amount || 0), 0);

            setStats({
                validatedAmount: validatedAmountMonthly,
                pending: totalPending,
                totalValidated: totalValidatedCount,
                monthlyValidated: monthlyValidatedCount,
                totalValidatedAmountGlobal: totalValidatedAmountGlobal
            });
            if (isInitial) setLoading(false);
        };

        fetchAndComputeStats(loading);
    }, [userId, refreshKey]);

    if (!user || loading) {
        return (
            <div className="grid gap-6 md:grid-cols-3 mb-10">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="glass-card overflow-hidden h-32">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-16" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Skeleton className="h-6 w-12 ml-auto" />
                                    <Skeleton className="h-2 w-8 ml-auto" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <motion.div
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="grid gap-6 md:grid-cols-3 mb-10"
        >
            <motion.div variants={itemVars}>
                <Card className="glass-card overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCheck className="h-16 w-16 text-primary" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vacations Validées</CardTitle>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-4xl font-bold text-gradient">{stats.monthlyValidated}</div>
                                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1">
                                    <CalendarDays className="h-3 w-3" />
                                    <span className="capitalize">{format(new Date(), 'MMMM yyyy', { locale: fr })}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-semibold">{stats.totalValidated}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVars}>
                <Card className="glass-card overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <HandCoins className="h-16 w-16 text-green-500" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Montant Validé</CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-r border-white/10 pr-2">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {stats.validatedAmount.toLocaleString('fr-TN', { minimumFractionDigits: 2 })} <span className="text-xs">DT</span>
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground mt-1 flex items-center gap-1 capitalize">
                                    <CalendarDays className="h-3 w-3" />
                                    {format(new Date(), 'MMMM yyyy', { locale: fr })}
                                </p>
                            </div>
                            <div className="pl-2">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {stats.totalValidatedAmountGlobal.toLocaleString('fr-TN', { minimumFractionDigits: 2 })} <span className="text-xs">DT</span>
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground mt-1">Total Global</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVars}>
                <Card className="glass-card overflow-hidden group border-yellow-500/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Hourglass className="h-16 w-16 text-yellow-500" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">En Attente</CardTitle>
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600 group-hover:scale-110 transition-transform">
                            <Hourglass className="h-5 w-5 animate-spin-slow" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                            <p className="text-xs font-medium text-muted-foreground mt-1">Demandes à traiter par l'admin</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}