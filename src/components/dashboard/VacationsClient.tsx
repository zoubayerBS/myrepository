'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppUser, Vacation, VacationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Filter, RefreshCw } from 'lucide-react';
import { VacationsTable } from './VacationsTable';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useRouter } from 'next/navigation';
import { VacationForm } from './VacationForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


interface VacationsClientProps {
  currentUser: AppUser; // This can be a placeholder from server
  isAdminView: boolean;
  initialVacations: Vacation[];
  allUsers?: AppUser[];
}

export function VacationsClient({
  isAdminView,
  initialVacations,
  allUsers = [],
}: VacationsClientProps) {
  const { user, userData } = useAuth(); // Use the current user from auth context
  const router = useRouter();
  const [vacations, setVacations] = useState<Vacation[]>(initialVacations);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  
  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);

  // Filters
  const [userFilter, setUserFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  const { toast } = useToast();

  const fetchVacations = useCallback(async () => {
    if (!user) return; // Don't fetch if no user
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
    // If we have a user, fetch their data.
    if(user){
      fetchVacations();
    } else {
      setIsLoading(false); // No user, stop loading
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
      const response = await fetch(`/api/vacations/${vacationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete vacation');
      }
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
        if (!response.ok) {
            throw new Error('Failed to update vacation status');
        }
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
  
  if (!user || !userData) {
      return (
          <div className="flex h-48 items-center justify-center">
              <p>Chargement des données utilisateur...</p>
          </div>
      );
  }

  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    await fetchVacations(); // Refetch all data to ensure consistency
  };

  return (
    <div className="space-y-8">
      {isAdminView ? (
         <h2 className="text-2xl font-bold font-sans">Toutes les vacations</h2>
      ) : (
        <div className="flex items-center justify-between">
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


      {isLoading ? (
        <div className="text-center p-8">Chargement des vacations...</div>
      ) : (
        <VacationsTable 
          vacations={filteredVacations} 
          isAdminView={isAdminView} 
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-sans">
                {vacationToEdit ? 'Modifier la vacation' : 'Ajouter une nouvelle vacation'}
            </DialogTitle>
            <DialogDescription>
                {vacationToEdit ? 'Mettez à jour les détails de la vacation.' : 'Remplissez le formulaire pour ajouter une vacation.'}
            </DialogDescription>
          </DialogHeader>
           {user && <VacationForm
                userId={user.uid}
                vacationToEdit={vacationToEdit}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
            />}
        </DialogContent>
      </Dialog>
    </div>
  );
}