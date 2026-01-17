'use client';

import { useState, useEffect, useMemo, Suspense, use } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, Hourglass, BarChart, FileText, Settings, Stethoscope } from 'lucide-react';
import { VacationsClient } from '@/components/dashboard/VacationsClient';
import { AdminVacationChart } from '@/components/dashboard/AdminVacationChart';
import { ReportGenerator } from '@/components/dashboard/ReportGenerator';
import { UsersListModal } from '@/components/dashboard/UsersListModal';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

import type { AppUser, Vacation } from '@/types';
import { getAllUsers, findAllVacations } from '@/lib/local-data';
import { SurgeonManager } from '@/components/dashboard/SurgeonManager';
import { Separator } from '@/components/ui/separator';
import { VacationAmountManager } from '@/components/dashboard/VacationAmountManager';
import { isWithinInterval, startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PulseLoader } from '@/components/ui/motion-loader';

export default function AdminPage({ searchParams }: { searchParams: Promise<any> }) {
    const resolvedSearchParams = use(searchParams);
    const router = useRouter();
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [allVacations, setAllVacations] = useState<Vacation[]>([]);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filteredVacations, setFilteredVacations] = useState<Vacation[]>([]);
    const [chartData, setChartData] = useState<Vacation[]>([]);
    const { user, userData } = useAuth();

    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        return { startDate: start, endDate: end };
    }, []);

    const periodString = `Du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`;

    const handleUserDelete = async (userId: string) => {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            setAllUsers(allUsers.filter(user => user.uid !== userId));
        } else {
            // Handle error
            console.error('Failed to delete user');
        }
    };

    useEffect(() => {
        async function fetchData() {
            // Fetch a large number of records for the top-level admin stats.
            // VacationsClient will handle its own paginated fetching.
            const [{ vacations: allFetchedVacations }, users] = await Promise.all([
                findAllVacations({ includeArchived: true, limit: 5000 }),
                getAllUsers(),
            ]);
            setAllVacations(allFetchedVacations);
            setAllUsers(users);
            setLoading(false);
        }
        fetchData();
    }, []);

    const handleMutation = () => {
        // Refetch everything to update counters and charts
        const fetchData = async () => {
            try {
                const [vacationsResponse, users] = await Promise.all([
                    fetch(`/api/vacations?includeArchived=true&limit=5000&t=${Date.now()}`),
                    getAllUsers(),
                ]);
                if (vacationsResponse.ok) {
                    const { vacations } = await vacationsResponse.json();
                    setAllVacations(vacations);
                }
                setAllUsers(users);
            } catch (error) {
                console.error("Failed to refresh admin data:", error);
            }
        };
        fetchData();
    };

    useEffect(() => {
        const filtered = allVacations.filter(v => {
            const isNotArchived = !v.isArchived;
            const isInInterval = isWithinInterval(new Date(v.date), { start: startDate, end: endDate });
            return isNotArchived && isInInterval;
        });
        setFilteredVacations(filtered);
    }, [allVacations, startDate, endDate]);

    useEffect(() => {
        const today = new Date();
        const start = subMonths(startOfMonth(today), 5); // Start of 6 months ago
        const end = endOfMonth(today); // End of current month

        const chartVacations = allVacations.filter(v => {
            const vacationDate = new Date(v.date);
            return isWithinInterval(vacationDate, { start, end });
        });
        setChartData(chartVacations);
    }, [allVacations]);

    const totalVacations = filteredVacations.length;
    const pendingVacationsPeriod = filteredVacations.filter(v => v.status === 'En attente' && !v.isArchived).length;
    const pendingVacationsGlobal = allVacations.filter(v => v.status === 'En attente' && !v.isArchived).length;
    const validatedVacations = filteredVacations.filter(v => v.status === 'Validée' && !v.isCec);
    const validatedVacationsCountPeriod = validatedVacations.length;
    const validatedVacationsCountGlobal = allVacations.filter(v => v.status === 'Validée' && !v.isCec).length;

    const totalValidatedAmount = validatedVacations.reduce((sum, v) => sum + v.amount, 0);
    const totalValidatedAmountGlobal = allVacations.filter(v => v.status === 'Validée' && !v.isCec).reduce((sum, v) => sum + v.amount, 0);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <PulseLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-12 bg-zinc-50 dark:bg-zinc-950">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container relative mx-auto p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Settings className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black tracking-tighter uppercase px-2 bg-primary/5 border-primary/20 text-primary">
                                Espace Administration
                            </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                            Panel Administrateur
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">
                            Surveillez l'activité globale et gérez les paramètres du système.
                        </p>
                    </div>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
                    {[
                        {
                            title: "Vacations Validées",
                            value: (
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="border-r border-zinc-200 dark:border-zinc-800 pr-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {validatedVacationsCountPeriod}
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 capitalize">{format(startDate, 'MMMM yyyy', { locale: fr })}</div>
                                    </div>
                                    <div className="pl-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {validatedVacationsCountGlobal}
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Total Global</div>
                                    </div>
                                </div>
                            ),
                            sub: null,
                            icon: CheckCircle,
                            color: "text-blue-500",
                            bg: "bg-blue-500/10",
                            isCustom: true
                        },
                        {
                            title: "Montant Validé",
                            value: (
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="border-r border-zinc-200 dark:border-zinc-800 pr-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {totalValidatedAmount.toFixed(2)} <span className="text-[10px] font-normal">DT</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 capitalize">{format(startDate, 'MMMM yyyy', { locale: fr })}</div>
                                    </div>
                                    <div className="pl-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {totalValidatedAmountGlobal.toFixed(2)} <span className="text-[10px] font-normal">DT</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Total Global</div>
                                    </div>
                                </div>
                            ),
                            sub: null, // Subtitle handled in custom value
                            icon: CheckCircle,
                            color: "text-emerald-500",
                            bg: "bg-emerald-500/10",
                            isCustom: true // Flag to adjust padding/layout if needed
                        },
                        {
                            title: "En Attente",
                            value: (
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="border-r border-zinc-200 dark:border-zinc-800 pr-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {pendingVacationsPeriod}
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 capitalize">{format(startDate, 'MMMM yyyy', { locale: fr })}</div>
                                    </div>
                                    <div className="pl-2">
                                        <div className="text-xl font-black tracking-tight">
                                            {pendingVacationsGlobal}
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Total Global</div>
                                    </div>
                                </div>
                            ),
                            sub: null,
                            icon: Hourglass,
                            color: "text-yellow-500",
                            bg: "bg-yellow-500/10",
                            isCustom: true
                        },
                        { title: "Utilisateurs", value: allUsers.length, sub: "Membres actifs", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", onClick: () => setIsUsersModalOpen(true) }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={stat.onClick}
                            className={cn(
                                "group relative overflow-hidden rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all duration-300",
                                stat.onClick && "cursor-pointer hover:scale-[1.02] active:scale-95"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    {stat.title}
                                </div>
                                <div className={cn("p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110", stat.bg, stat.color)}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                {typeof stat.value === 'object' ? stat.value : <div className="text-3xl font-black tracking-tight">{stat.value}</div>}

                                {stat.sub && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground/60 mt-1 uppercase tracking-tighter">
                                        {stat.sub}
                                        {/* Show period only for non-custom cards that need it */}
                                        {!stat.isCustom && (stat.title.includes("Période") || stat.sub.includes("Période")) ? (
                                            <span className="text-[10px] opacity-40 ml-1">({periodString})</span>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                                <stat.icon className="h-24 w-24" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl mb-12 overflow-hidden">
                        <CardHeader className="p-8 pb-4 relative overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl font-black tracking-tight">Gestion & Utilitaires</CardTitle>
                                        <p className="text-sm font-medium text-muted-foreground mt-1">Configurez le système et générez des analyses croisées.</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-8">
                            <Accordion type="single" collapsible className="w-full space-y-4">
                                {[
                                    {
                                        id: "analytics",
                                        title: "Analyse Mensuelle",
                                        subtitle: "Données graphiques et tendances des vacations",
                                        icon: BarChart,
                                        content: <AdminVacationChart data={chartData} />
                                    },
                                    {
                                        id: "reports",
                                        title: "Générateur de Rapports",
                                        subtitle: "Exportations PDF et CSV personnalisées",
                                        icon: FileText,
                                        content: userData && <ReportGenerator allVacations={allVacations} allUsers={allUsers} currentUser={userData} isAdmin={true} />
                                    },
                                    {
                                        id: "surgeons",
                                        title: "Gestion des Chirurgiens",
                                        subtitle: "Ajoutez ou retirez des praticiens de la liste",
                                        icon: Stethoscope,
                                        content: <div className="pt-4"><SurgeonManager /></div>
                                    },
                                    {
                                        id: "amounts",
                                        title: "Tarification",
                                        subtitle: "Configuration des montants par acte et motif",
                                        icon: Settings,
                                        content: <div className="pt-4"><VacationAmountManager /></div>
                                    }
                                ].map((item) => (
                                    <AccordionItem
                                        key={item.id}
                                        value={item.id}
                                        className="border-none rounded-2xl px-2 transition-all duration-200 hover:bg-white/5"
                                    >
                                        <AccordionTrigger className="hover:no-underline p-4 group">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-muted-foreground group-data-[state=open]:bg-primary group-data-[state=open]:text-white transition-all duration-300">
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-black tracking-tight text-lg leading-none">{item.title}</div>
                                                    <div className="text-xs font-medium text-muted-foreground mt-1 opacity-60 tracking-tight">{item.subtitle}</div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-6">
                                            <div className="p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                                                {item.content}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <VacationsClient
                        initialVacations={[]}
                        allUsers={allUsers}
                        isAdminView={true}
                        onMutation={handleMutation}
                        searchParams={resolvedSearchParams}
                    />
                </motion.div>

                <UsersListModal
                    isOpen={isUsersModalOpen}
                    onClose={() => setIsUsersModalOpen(false)}
                    users={allUsers}
                    onUserDelete={handleUserDelete}
                />
            </div>
        </div>
    );
}
