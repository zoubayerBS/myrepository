'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppUser, Vacation, VacationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Filter, RefreshCw, MoreHorizontal, FilePenLine, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { VacationsTable } from './VacationsTable';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useRouter } from 'next/navigation';
import { VacationForm } from './VacationForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';

// ✅ Hook utilitaire pour détecter si on est sur mobile
function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
  const getStatusClasses = (status: VacationStatus) => {
    switch (status) {
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'Refusée':
        return 'bg-red-100 text-red-800 border-red-800 hover:bg-red-100';
      case 'En attente':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    }
  };

interface VacationsClientProps {
  currentUser: AppUser;
  isAdminView: boolean;
  initialVacations: Vacation[];
  allUsers?: AppUser[];
}

export function VacationsClient({
  isAdminView,
  initialVacations,
  allUsers = [],
}: VacationsClientProps) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [vacations, setVacations] = useState<Vacation[]>(initialVacations);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);

  // Filters
  const [userFilter, setUserFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Pagination State for mobile view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2; // Show 2 cards per page on mobile

  const fetchVacations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let fetchedVacations: Vacation[];
      if (isAdminView) {
        if (userData?.role !== 'admin') {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Accès non autorisé.' });
          setIsLoading(false);
          return;
        }
        const response = await fetch('/api/vacations');
        fetchedVacations = await response.json();
      } else {
        const response = await fetch(`/api/vacations?userId=${user.uid}`);
        fetchedVacations = await response.json();
      }
      setVacations(fetchedVacations);
    } catch (error) {
      console.error("Erreur lors de la récupération des vacations: ", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les vacations.' });
    }
    setIsLoading(false);
  }, [isAdminView, user, userData?.role, toast]);

  useEffect(() => {
    if(user){
      fetchVacations();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchVacations]);

  const handleEdit = (vacation: Vacation) => {
    setVacationToEdit(vacation);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setVacationToEdit(null);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (vacationId: string) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vacation');
      toast({ title: 'Succès', description: 'Vacation supprimée.' });
      setVacations(prev => prev.filter(v => v.id !== vacationId));
    } catch (error) {
      console.error("Erreur lors de la suppression de la vacation: ", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la vacation.' });
    }
  };

  const handleStatusChange = async (vacationId: string, status: VacationStatus) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update vacation status');
      const updatedVacation = await response.json();
      toast({ title: 'Succès', description: `Statut de la vacation mis à jour.` });
      setVacations(prev => prev.map(v => v.id === vacationId ? updatedVacation : v));
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut: ", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le statut.' });
    }
  };

  const filteredVacations = useMemo(() => {
    return vacations.filter(v => {
      const userMatch = !isAdminView || userFilter === 'all' || v.userId === userFilter;
      const typeMatch = typeFilter === 'all' || v.type === typeFilter;
      const statusMatch = statusFilter === 'all' || v.status === statusFilter;
      return userMatch && typeMatch && statusMatch;
    });
  }, [vacations, userFilter, typeFilter, statusFilter, isAdminView]);
  
  // Pagination logic for mobile view
  const totalPages = Math.ceil(filteredVacations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMobileVacations = filteredVacations.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusClasses = (status: VacationStatus) => {
    switch (status) {
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'Refusée':
        return 'bg-red-100 text-red-800 border-red-800 hover:bg-red-100';
      case 'En attente':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      }
    },
    onSwipedRight: () => {
      if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!user || !userData) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p>Chargement des données utilisateur...</p>
      </div>
    );
  }

  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    await fetchVacations();
  };

  return (
    <div className="space-y-8">
      {isAdminView ? (
         <h2 className="text-2xl font-bold font-sans">Toutes les vacations</h2>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-sans">Mes vacations</h1>
            <p className="text-muted-foreground">Gérez vos vacations enregistrées.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fetchVacations()} variant="outline" size="icon" className="h-9 w-9">
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Rafraîchir</span>
            </Button>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouvelle vacation
            </Button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isAdminView && (
            <div className="flex-1">
              <Label>Utilisateur</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>{user.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex-1">
            <Label>Nature de l'acte</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="acte">Acte</SelectItem>
                <SelectItem value="forfait">Forfait</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="Validée">Validée</SelectItem>
                <SelectItem value="Refusée">Refusée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      {isLoading ? (
        <div className="text-center p-8">Chargement des vacations...</div>
      ) : (
        isMobile ? (
          <div className="space-y-4" {...handlers}>
            {currentMobileVacations.length > 0 ? (
              currentMobileVacations.map((vacation) => (
                <Card key={vacation.id} className="p-4 w-full">
                  <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold truncate"> {/* Added truncate */}
                      {vacation.patientName} ({vacation.operation})
                    </CardTitle>
                    <DropdownMenu className="flex-shrink-0"> {/* Added flex-shrink-0 */}
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Ouvrir le menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {isAdminView && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vacation.id, vacation.status === 'Validée' ? 'En attente' : 'Validée')}> 
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {vacation.status === 'Validée' ? 'Mettre en attente' : 'Valider'}
                          </DropdownMenuItem>
                        )}
                        {isAdminView && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vacation.id, vacation.status === 'Refusée' ? 'En attente' : 'Refusée')}> 
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            {vacation.status === 'Refusée' ? 'Mettre en attente' : 'Refuser'}
                          </DropdownMenuItem>
                        )}
                        {isAdminView && <DropdownMenuSeparator />}
                        <DropdownMenuItem 
                            onClick={() => handleEdit(vacation)}
                            disabled={vacation.status !== 'En attente'}
                        >
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(vacation.id)}
                          disabled={vacation.status !== 'En attente'}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-0 text-sm overflow-x-auto">
                    {isAdminView && (
                      <div className="text-muted-foreground break-words">Employé: <span className="font-medium text-foreground">{vacation.user?.prenom} {vacation.user?.nom}</span></div>
                    )}
                    <div className="text-muted-foreground break-words">Date: <span className="font-medium text-foreground">{format(new Date(vacation.date), 'd MMMM yyyy', { locale: fr })}</span></div>
                    <div className="text-muted-foreground break-words">Heure: <span className="font-medium text-foreground">{vacation.time}</span></div>
                    <div className="text-muted-foreground break-words">Motif: <span className="font-medium text-foreground">{vacation.reason}</span></div>
                    <div className="text-muted-foreground break-words">Type: <Badge variant={vacation.type === 'acte' ? 'default' : 'secondary'} className="max-w-full overflow-hidden">{vacation.type === 'acte' ? 'Acte' : 'Forfait'}</Badge></div>
                    <div className="text-muted-foreground break-words">Statut: <Badge className={cn('capitalize', getStatusClasses(vacation.status), "max-w-full overflow-hidden")}>{vacation.status}</Badge></div>
                    <div className="text-muted-foreground break-words">Montant: <span className="font-medium text-foreground">{vacation.amount.toFixed(2)} DT</span></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-4 text-gray-500">
                Aucune vacation trouvée.
              </div>
            )}
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                {Array.from({ length: totalPages }, (_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "block h-2 w-2 rounded-full",
                      currentPage === index + 1 ? "bg-blue-500" : "bg-gray-300"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <VacationsTable 
            vacations={filteredVacations} 
            isAdminView={isAdminView} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )
      )}

      {/* Formulaire modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={cn("sm:max-w-xl", isMobile && "w-full h-full")}>
          <DialogHeader>
            <DialogTitle className="font-sans">
              {vacationToEdit ? 'Modifier la vacation' : 'Ajouter une nouvelle vacation'}
            </DialogTitle>
            <DialogDescription>
              {vacationToEdit ? 'Mettez à jour les détails de la vacation.' : 'Remplissez le formulaire pour ajouter une vacation.'}
            </DialogDescription>
          </DialogHeader>

          {user && (
            <VacationForm
              userId={user.uid}
              vacationToEdit={vacationToEdit}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          )}

          {/* ✅ Footer scrollable en mode mobile */}
    {/*       <div
            className={cn(
              "mt-4 flex gap-2",
              isMobile ? "overflow-x-auto pb-2 -mx-2 px-2" : "justify-end"
            )}
          >
            <div className="flex gap-2 min-w-max">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" form="vacation-form">
                {vacationToEdit ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
          </div> */}
        </DialogContent>
      </Dialog>
    </div>
  );
}