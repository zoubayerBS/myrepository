
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, Hourglass, BarChart, FileText, Settings, Trophy, Stethoscope } from 'lucide-react';
import { VacationsClient } from '@/components/dashboard/VacationsClient';
import { AdminVacationChart } from '@/components/dashboard/AdminVacationChart';
import { ReportGenerator } from '@/components/dashboard/ReportGenerator';
import { SettingsForm } from '@/components/dashboard/SettingsForm';
import { EmployeeLeaderboard } from '@/components/dashboard/EmployeeLeaderboard';
import type { AppUser, Vacation } from '@/types';
import { getAllUsers, findAllVacations } from '@/lib/local-data';
import { SurgeonManager } from '@/components/dashboard/SurgeonManager';
import { Separator } from '@/components/ui/separator';

export const revalidate = 0; // Disable caching

export default async function AdminPage() {
    
    const allVacations = await findAllVacations();
    const allUsers = await getAllUsers();
    
    const totalVacations = allVacations.length;
    const pendingVacations = allVacations.filter(v => v.status === 'En attente').length;
    const validatedVacations = allVacations.filter(v => v.status === 'Validée');
    const totalValidatedAmount = validatedVacations.reduce((sum, v) => sum + v.amount, 0);

    const placeholderUser: AppUser = { uid: '', username: '', role: 'admin', email: '' };

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
                        <p className="text-xs text-muted-foreground">Basé sur {validatedVacations.length} demandes validées</p>
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
                 <Card>
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
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart className="h-5 w-5" />
                          Analyse Mensuelle
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <AdminVacationChart data={allVacations} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Performance des Employés
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <EmployeeLeaderboard vacations={validatedVacations} users={allUsers} />
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Générateur de Rapports
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ReportGenerator allVacations={allVacations} allUsers={allUsers} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Utilitaires
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <SettingsForm />
                        <Separator />
                        <SurgeonManager />
                    </CardContent>
                </Card>
            </div>

            <VacationsClient 
                currentUser={placeholderUser}
                initialVacations={allVacations}
                allUsers={allUsers}
                isAdminView={true}
            />
        </div>
    );
}
