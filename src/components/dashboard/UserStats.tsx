'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { findVacationsByUserId } from '@/lib/local-data';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Hourglass, HandCoins, CheckCheck, TrendingUp, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vacation } from '@/types';

interface UserStatsProps {
    userId: string;
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
};

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
            const { vacations: allVacations } = await findVacationsByUserId(userId, { limit: 9999 });
            const now = new Date();

            const startOfCurrentMonth = startOfMonth(now);
            const endOfCurrentMonth = endOfMonth(now);

            const totalPending = allVacations.filter(v => v.status === 'En attente').length;
            const allValidatedVacations = allVacations.filter(v => v.status === 'Validée');
            const totalValidatedCount = allValidatedVacations.length;

            const monthlyValidatedVacations = allValidatedVacations.filter(v =>
                isWithinInterval(new Date(v.date), { start: startOfCurrentMonth, end: endOfCurrentMonth })
            );
            const monthlyValidatedCount = monthlyValidatedVacations.length;
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
        return (
            <div className="grid gap-6 md:grid-cols-3 mb-10">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
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
                                    <span>Ce mois-ci</span>
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
                        <div>
                            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                                {stats.validatedAmount.toLocaleString('fr-TN', { minimumFractionDigits: 2 })} <span className="text-lg">DT</span>
                            </div>
                            <p className="text-xs font-medium text-muted-foreground mt-1">Gains validés sur la période</p>
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