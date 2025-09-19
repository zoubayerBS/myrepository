'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, Hourglass, BarChart, FileText, Settings, Trophy, Stethoscope } from 'lucide-react';
import { VacationsClient } from '@/components/dashboard/VacationsClient';
import { AdminVacationChart } from '@/components/dashboard/AdminVacationChart';
import { ReportGenerator } from '@/components/dashboard/ReportGenerator';
import { UsersListModal } from '@/components/dashboard/UsersListModal';

import { EmployeeLeaderboard } from '@/components/dashboard/EmployeeLeaderboard';
import type { AppUser, Vacation } from '@/types';
import { getAllUsers, findAllVacations } from '@/lib/local-data';
import { SurgeonManager } from '@/components/dashboard/SurgeonManager';
import { Separator } from '@/components/ui/separator';
import { VacationAmountManager } from '@/components/dashboard/VacationAmountManager';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function AdminPage() {
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [allVacations, setAllVacations] = useState<Vacation[]>([]);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

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
            const [vacations, users] = await Promise.all([
                findAllVacations(),
                getAllUsers(),
            ]);
            setAllVacations(vacations);
            setAllUsers(users);
            setLoading(false);
        }
        fetchData();
    }, []);
    
    const totalVacations = allVacations.length;
    const pendingVacations = allVacations.filter(v => v.status === 'En attente').length;
    const validatedVacations = allVacations.filter(v => v.status === 'Validée');
    const totalValidatedAmount = validatedVacations.reduce((sum, v) => sum + v.amount, 0);

    const placeholderUser: AppUser = { uid: '', username: '', nom: '', prenom: '', fonction: 'panseur', role: 'admin', email: '' };

    if (loading) {
        return <div>Chargement...</div>
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold font-sans mb-8">Panel Administrateur</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total des demandes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalVacations}</div>
                        <p className="text-xs text-muted-foreground">Toutes les demandes enregistrées</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Montant Total Validé</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalValidatedAmount.toFixed(2)} DT</div>
                        <p className="text-xs text-muted-foreground">Basé sur {validatedVacations.length} demandes validées (toutes périodes)</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Demandes en Attente</CardTitle>
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingVacations}</div>
                        <p className="text-xs text-muted-foreground">En attente de validation</p>
                    </CardContent>
                </Card>
                 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsUsersModalOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allUsers.length}</div>
                         <p className="text-xs text-muted-foreground">Nombre total d'utilisateurs</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card className="mb-8">
                <CardHeader className="bg-primary text-white rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        <CardTitle className="text-2xl font-bold font-sans">Gestion et Rapports</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <BarChart className="h-5 w-5" />
                                    <CardTitle className="text-xl">Analyse Mensuelle</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="lg:col-span-2 border-none shadow-none">
                                    <CardContent className="pl-2">
                                        <AdminVacationChart data={allVacations} />
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5" />
                                    <CardTitle className="text-xl">Performance des Employés</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="border-none shadow-none">
                                    <CardContent>
                                        <EmployeeLeaderboard vacations={validatedVacations} users={allUsers} />
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    <CardTitle className="text-xl">Générateur de Rapports</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="border-none shadow-none">
                                    <CardContent>
                                        <ReportGenerator allVacations={allVacations} allUsers={allUsers} />
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    <CardTitle className="text-xl">Utilitaires</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="border-none shadow-none">
                                    <CardContent className="space-y-6">
                                        <SurgeonManager />
                                        <Separator />
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="h-5 w-5" />
                                    <CardTitle className="text-xl">Gestion des Montants par Fonction, Motif et Type</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="border-none shadow-none">
                                    <CardContent>
                                        <VacationAmountManager />
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            <VacationsClient 
                currentUser={placeholderUser}
                initialVacations={allVacations}
                allUsers={allUsers}
                isAdminView={true}
            />
            <UsersListModal isOpen={isUsersModalOpen} onClose={() => setIsUsersModalOpen(false)} users={allUsers} onUserDelete={handleUserDelete} />
        </div>
    );
}