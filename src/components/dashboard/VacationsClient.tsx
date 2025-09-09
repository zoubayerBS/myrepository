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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
import { sendMessage } from '@/lib/actions/message-actions';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';

// Hook mobile
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

interface VacationsClientProps {
  currentUser: AppUser;
  isAdminView: boolean;
  initialVacations: Vacation[];
  allUsers?: AppUser[];
}

export function VacationsClient({ isAdminView, initialVacations, allUsers = [] }: VacationsClientProps) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [vacations, setVacations] = useState<Vacation[]>(initialVacations);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);

  const [userFilter, setUserFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les vacations.' });
    }
    setIsLoading(false);
  }, [isAdminView, user, userData?.role, toast]);

  useEffect(() => {
    if (user) fetchVacations();
    else setIsLoading(false);
  }, [user, fetchVacations]);

  const handleEdit = (vacation: Vacation) => { setVacationToEdit(vacation); setIsFormOpen(true); };
  const handleAddNew = () => { setVacationToEdit(null); setIsFormOpen(true); };
  
  const handleDelete = async (vacationId: string) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vacation');
      toast({ title: 'Succès', description: 'Vacation supprimée.' });
      setVacations(prev => prev.filter(v => v.id !== vacationId));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la vacation.' });
    }
  };

  const confirmDelete = () => {
    if (vacationToDelete) {
      handleDelete(vacationToDelete.id).finally(() => setVacationToDelete(null));
    }
  };

  const handleStatusChange = async (vacationId: string, status: VacationStatus) => {
    console.log(`handleStatusChange called for vacationId: ${vacationId}, status: ${status}`);
    const vacation = vacations.find(v => v.id === vacationId);
    if (!vacation || !user || !userData) return;

    try {
      const response = await fetch(`/api/vacations/${vacationId}/status`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status }) 
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      const updatedVacation = await response.json();
      setVacations(prev => prev.map(v => (v.id === vacationId ? updatedVacation : v)));
      toast({ title: 'Succès', description: 'Statut mis à jour.' });

      const subject = `Mise à jour du statut de votre vacation`;
      const content = `Votre demande de vacation pour le ${format(new Date(vacation.date), 'dd/MM/yyyy', { locale: fr })} a été ${status.toLowerCase()} par ${userData.username}.`;
      
      await sendMessage({
        senderId: user.uid,
        receiverId: vacation.userId,
        subject,
        content,
      });

    } catch (error) {
      console.error("Error changing status or sending notification:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le statut ou d\'envoyer la notification.' });
    }
  };

  const filteredVacations = useMemo(() => {
    let filtered = vacations.filter(v => {
      const userMatch = !isAdminView || userFilter === 'all' || v.userId === userFilter;
      const typeMatch = typeFilter === 'all' || v.type === typeFilter;
      const statusMatch = statusFilter === 'all' || v.status === statusFilter;
      return userMatch && typeMatch && statusMatch;
    });

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.patientName.toLowerCase().includes(lowerCaseQuery) ||
        v.matricule.toLowerCase().includes(lowerCaseQuery) ||
        v.surgeon.toLowerCase().includes(lowerCaseQuery) ||
        v.operation.toLowerCase().includes(lowerCaseQuery) ||
        v.reason.toLowerCase().includes(lowerCaseQuery) ||
        v.type.toLowerCase().includes(lowerCaseQuery) ||
        v.user?.username?.toLowerCase().includes(lowerCaseQuery) || // Search by username if available
        v.user?.nom?.toLowerCase().includes(lowerCaseQuery) || // Search by user's last name
        v.user?.prenom?.toLowerCase().includes(lowerCaseQuery) // Search by user's first name
      );
    }
    return filtered;
  }, [vacations, userFilter, typeFilter, statusFilter, isAdminView, searchQuery]);

  const totalPages = Math.ceil(filteredVacations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMobileVacations = filteredVacations.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusClasses = (status: VacationStatus) => {
    switch (status) {
      case 'Validée': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'Refusée': return 'bg-red-100 text-red-800 border-red-800 hover:bg-red-100';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); },
    onSwipedRight: () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!user || !userData) return <div className="flex h-48 items-center justify-center">Chargement des données...</div>;

  const handleFormSuccess = async () => { setIsFormOpen(false); await fetchVacations(); };

  return (
    <div className="space-y-8 w-full overflow-x-hidden">

      {/* Header */}
      {isAdminView ? (
        <h2 className="text-2xl font-bold font-sans">Toutes les vacations</h2>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-sans">Mes vacations</h1>
            <p className="text-muted-foreground">Gérez vos vacations enregistrées.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchVacations} variant="outline" size="icon" className="h-9 w-9"><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle vacation</Button>
          </div>
        </div>
      )}

      {/* Filtres + Tableau dans wrapper pour éviter overflow */}
      <div className="w-full overflow-x-hidden">
        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtres</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex-1 col-span-full"> {/* Make search span full width */}
              <Label htmlFor="search">Recherche</Label>
              <Input
                id="search"
                type="text"
                autoComplete='off'
                placeholder="Rechercher une vacation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            {isAdminView && (
              <div className="flex-1">
                <Label>Utilisateur</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger><SelectValue placeholder="Filtrer par utilisateur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {allUsers.map(user => <SelectItem key={user.uid} value={user.uid}>{user.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1">
              <Label>Nature de l'acte</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Filtrer par type" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
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
        <br />

        {/* Vacations */}
        {isLoading ? (
          <div className="text-center p-8">Chargement...</div>
        ) : isMobile ? (
          <div className="space-y-4 px-4" {...handlers}>
            {currentMobileVacations.map(v => (
              <Card key={v.id} className="p-4 max-w-full">
                <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold truncate">{v.patientName}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild >
                      <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger >
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {isAdminView && (
                        <DropdownMenuItem onClick={() => handleStatusChange(v.id, v.status === 'Validée' ? 'En attente' : 'Validée')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          {v.status === 'Validée' ? 'Mettre en attente' : 'Valider'}
                        </DropdownMenuItem>
                      )}
                      {isAdminView && (
                        <DropdownMenuItem onClick={() => handleStatusChange(v.id, v.status === 'Refusée' ? 'En attente' : 'Refusée')}>
                          <XCircle className="mr-2 h-4 w-4 text-red-500" />
                          {v.status === 'Refusée' ? 'Mettre en attente' : 'Refuser'}
                        </DropdownMenuItem>
                      )}
                      {isAdminView && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => handleEdit(v)} disabled={v.status !== 'En attente'}>
                        <FilePenLine className="mr-2 h-4 w-4" />Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setVacationToDelete(v)} disabled={v.status !== 'En attente'}>
                        <Trash2 className="mr-2 h-4 w-4" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-0 text-sm overflow-x-auto">
                  {isAdminView && <div className="text-muted-foreground break-words">Employé: <span className="font-medium text-foreground">{v.user?.prenom} {v.user?.nom}</span></div>}
                  <div className="text-muted-foreground break-words">Date: <span className="font-medium text-foreground">{format(new Date(v.date), 'd MMMM yyyy', { locale: fr })}</span></div>
                  <div className="text-muted-foreground break-words">Heure: <span className="font-medium text-foreground">{v.time}</span></div>
                  <div className="text-muted-foreground break-words">Motif: <span className="font-medium text-foreground">{v.reason}</span></div>
                  <div className="text-muted-foreground break-words">Type: <Badge variant={v.type==='acte'?'default':'secondary'}>{v.type==='acte'?'Acte':'Forfait'}</Badge></div>
                  <div className="text-muted-foreground break-words">Statut: <Badge className={cn(getStatusClasses(v.status))}>{v.status}</Badge></div>
                  <div className="text-muted-foreground break-words">Montant: <span className="font-medium text-foreground">{v.amount.toFixed(2)} DT</span></div>
                </CardContent>
              </Card>
            ))}
            {totalPages > 1 && <div className="flex justify-center space-x-2 mt-4">{Array.from({ length: totalPages }, (_, i) => <span key={i} className={cn("block h-2 w-2 rounded-full", currentPage === i+1?"bg-blue-500":"bg-gray-300")}></span>)}</div>}
          </div>
        ) : (
          <>
            <VacationsTable
              vacations={filteredVacations.slice(indexOfFirstItem, indexOfLastItem)} // Apply pagination here
              isAdminView={isAdminView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Précédent
                </Button>
                <span>Page {currentPage} sur {totalPages}</span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      

      {/* Formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={cn("sm:max-w-xl", isMobile && "w-full h-full")}>
          <DialogHeader>
            <DialogTitle>{vacationToEdit ? 'Modifier la vacation' : 'Ajouter une nouvelle vacation'}</DialogTitle>
            <DialogDescription>{vacationToEdit ? 'Mettez à jour les détails de la vacation.' : 'Remplissez le formulaire pour ajouter une vacation.'}</DialogDescription>
          </DialogHeader>
          {user && <VacationForm userId={user.uid} vacationToEdit={vacationToEdit} onSuccess={handleFormSuccess} onCancel={() => setIsFormOpen(false)} isAdmin={isAdminView} />}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!vacationToDelete} onOpenChange={(open) => !open && setVacationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera définitivement la vacation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
