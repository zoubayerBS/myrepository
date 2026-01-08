'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppUser, Vacation, VacationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { PulseLoader, SpinnerLoader } from '@/components/ui/motion-loader';
import { Plus, PlusCircle, Filter, RefreshCw, MoreHorizontal, FilePenLine, Trash2, CheckCircle, XCircle, Archive, ArchiveRestore, FileText, UserRound, Loader2 } from 'lucide-react';
import { VacationsTable } from './VacationsTable';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pagination } from '@/components/ui/pagination';
import { useRouter, useSearchParams } from 'next/navigation';
import { VacationForm } from './VacationForm';
import { ReportGenerator } from './ReportGenerator';
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
import { Check, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { subDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Helper to get the default payroll date range
const getDefaultDateRange = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);
  return { startDate, endDate };
};

interface VacationsClientProps {
  isAdminView: boolean;
  initialVacations: Vacation[];
  allUsers?: AppUser[];
  historyMode?: boolean;
  archiveMode?: boolean;
  pendingMode?: boolean;
  onMutation?: () => void;
}

export function VacationsClient({ isAdminView, initialVacations, allUsers = [], historyMode = false, archiveMode = false, pendingMode = false, onMutation }: VacationsClientProps) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vacations, setVacations] = useState<Vacation[]>(initialVacations);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);
  const [allMotifs, setAllMotifs] = useState<string[]>([]);

  const [userFilter, setUserFilter] = useState<string>(searchParams.get('userFilter') || 'all');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('typeFilter') || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('statusFilter') || (historyMode ? 'Validée,Refusée' : 'all'));
  const [motifFilter, setMotifFilter] = useState<string>(searchParams.get('motifFilter') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('searchQuery') || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined
  );


  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchMotifs = async () => {
      try {
        const response = await fetch('/api/vacations/reasons');
        if (!response.ok) {
          throw new Error('Failed to fetch reasons');
        }
        const data = await response.json();
        setAllMotifs(data);
      } catch (error) {
        console.error("Failed to fetch motifs:", error);
        // Do not toast here, it could be annoying
      }
    };
    fetchMotifs();
  }, []);

  const handleEdit = (vacation: Vacation) => { setVacationToEdit(vacation); setIsFormOpen(true); };
  const handleAddNew = () => { setVacationToEdit(null); setIsFormOpen(true); };

  const handleDelete = async (vacationId: string) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vacation');
      toast({ title: 'Succès', description: 'Vacation supprimée.' });
      // Refetch current page after deletion
      await fetchVacations(currentPage);
      onMutation?.();
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
    const vacation = vacations.find(v => v.id === vacationId);
    if (!vacation || !user || !userData) return;

    try {
      const response = await fetch(`/api/vacations/${vacationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');

      // Optimistic update
      setVacations(prev => prev.map(v => (v.id === vacationId ? { ...v, status } : v)));
      toast({ title: 'Succès', description: 'Statut mis à jour.' });
      onMutation?.();

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
      // Revert optimistic update on error
      await fetchVacations(currentPage);
    }
  };

  const handleArchive = async (vacationId: string) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to archive vacation');
      }
      toast({ title: 'Succès', description: 'Vacation archivée.' });
      await fetchVacations(currentPage);
      onMutation?.();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'archiver la vacation." });
    }
  };

  const handleUnarchive = async (vacationId: string) => {
    try {
      const response = await fetch(`/api/vacations/${vacationId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });
      if (!response.ok) {
        throw new Error('Failed to unarchive vacation');
      }
      toast({ title: 'Succès', description: 'Vacation désarchivée.' });
      await fetchVacations(currentPage);
      onMutation?.();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de désarchiver la vacation." });
    }
  };

  const fetchVacations = useCallback(async (page: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
        statusFilter: statusFilter,
        typeFilter: typeFilter,
        motifFilter: motifFilter,
        searchQuery: searchQuery,
      });
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('t', String(Date.now()));

      let urlBase = '/api/vacations';
      if (archiveMode) {
        params.set('archivedOnly', 'true');
      } else if (isAdminView) {
        params.set('includeArchived', 'false');
        params.set('userFilter', userFilter);
      } else {
        params.set('userId', user.uid);
        // For user view, if no filters are on, get default set (current month or pending)
        if (statusFilter === 'all' && typeFilter === 'all' && motifFilter === 'all' && !searchQuery && !startDate && !endDate) {
          params.set('userDefaultView', 'true');
        }
      }

      const response = await fetch(`${urlBase}?${params.toString()}`);

      if (!response.ok) throw new Error('Failed to fetch vacations');
      const data = await response.json();

      setVacations(data.vacations || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error('Fetch error:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les vacations.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdminView, archiveMode, toast, statusFilter, typeFilter, motifFilter, searchQuery, startDate, endDate, userFilter, itemsPerPage]);

  useEffect(() => {
    if (user) {
      fetchVacations(currentPage);
    }
  }, [currentPage, user, fetchVacations]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      if (user) {
        fetchVacations(1);
      }
    }
  }, [userFilter, typeFilter, statusFilter, motifFilter, searchQuery, startDate, endDate]);

  // Data is now paginated and filtered by the server.
  const currentMobileVacations = vacations;

  const getStatusClasses = (status: VacationStatus) => {
    switch (status) {
      case 'Validée': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'Refusée': return 'bg-red-100 text-red-800 border-red-800 hover:bg-red-100';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 animate-blink';
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); },
    onSwipedRight: () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!user || !userData) return <div className="flex h-48 items-center justify-center">Chargement des données...</div>;

  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    await fetchVacations(currentPage);
    // Tiny delay to ensure DB consistency before parent refresh
    setTimeout(() => {
      onMutation?.();
    }, 100);
  };

  const exportValidatedToCSV = () => {
    const headers = isAdminView
      ? ['Nom Complet', 'Date', 'Heure', 'Patient', 'Matricule', 'Chirurgien', 'Opération', 'Motif', 'Type', 'Statut', 'Montant (DT)']
      : ['Date', 'Heure', 'Patient', 'Matricule', 'Chirurgien', 'Opération', 'Motif', 'Type', 'Statut', 'Montant (DT)'];

    const validatedVacations = vacations.filter((v: Vacation) => v.status === 'Validée');
    const rows = validatedVacations.map((v: Vacation) => {
      const commonData = [
        format(new Date(v.date), 'dd/MM/yyyy'),
        v.time,
        v.patientName,
        v.matricule,
        v.surgeon,
        v.operation,
        v.reason,
        v.type === 'acte' ? 'Acte' : 'Forfait',
        v.status,
        v.amount.toFixed(2)
      ];
      return isAdminView
        ? [`${v.user?.prenom ?? ''} ${v.user?.nom ?? ''}`.trim(), ...commonData]
        : commonData;
    });

    const totalValidatedAmount = validatedVacations.reduce((sum: number, v: Vacation) => sum + v.amount, 0);

    let csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map((e: string[]) => e.join(','))].join("\n");

    csvContent += `\n\nTotal Validée,${totalValidatedAmount.toFixed(2)}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_vacations_validees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="space-y-8 w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gradient">
              {archiveMode ? "Archives" : historyMode ? "Historique" : isAdminView ? "Gestion des Vacations" : "Mes Vacations"}
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              {archiveMode
                ? "Consultez et restaurez vos vacations archivées."
                : historyMode
                  ? "Retrouvez l'ensemble de vos activités passées."
                  : "Suivez et gérez vos vacations en temps réel."}
            </p>
          </div>

          {!archiveMode && !historyMode && !isAdminView && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => fetchVacations(currentPage)}
                variant="outline"
                size="icon"
                className="glass hover:bg-white/50 dark:hover:bg-black/50 border-white/20 shadow-sm"
              >
                {isLoading ? <SpinnerLoader className="h-4 w-4" /> : <RefreshCw className={cn("h-4 w-4")} />}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsReportModalOpen(true)}
                      variant="outline"
                      size="icon"
                      className="glass hover:bg-white/50 dark:hover:bg-black/50 border-white/20 shadow-sm"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Générer mon rapport</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                onClick={handleAddNew}
                className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle vacation
              </Button>
            </div>
          )}
        </div>

        {/* Filters Section */}
        {/* Filters Section */}
        <Accordion type="single" collapsible className="mb-10 w-full glass border-none shadow-sm overflow-hidden rounded-xl">
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="bg-primary/10 border-b border-white/20 dark:border-white/10 px-6 py-4 hover:no-underline hover:bg-primary/15 transition-all">
              <div className="text-lg font-bold flex items-center gap-3 text-foreground">
                <div className="p-2 bg-primary/20 rounded-lg border border-primary/20 shadow-sm">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <span className="opacity-80">Options de filtrage</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12 lg:col-span-3">
                  <Label htmlFor="search" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Recherche</Label>
                  <div className="relative">
                    <Input
                      id="search"
                      type="text"
                      autoComplete='off'
                      placeholder="Patient, matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/10 dark:bg-black/10 backdrop-blur-sm pl-10 h-11 border-white/20 focus-visible:ring-primary/30"
                    />
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  </div>
                </div>

                <div className="md:col-span-6 lg:col-span-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Période</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/20',
                          !startDate && !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary opacity-70" />
                        {startDate ? (
                          endDate ? (
                            <>
                              {format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
                            </>
                          ) : (
                            format(startDate, 'dd MMM yyyy', { locale: fr })
                          )
                        ) : (
                          <span>Toute la période</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass shadow-2xl border-white/20" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={startDate}
                        selected={{ from: startDate, to: endDate }}
                        onSelect={(range) => {
                          setStartDate(range?.from);
                          setEndDate(range?.to);
                        }}
                        numberOfMonths={1}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="md:col-span-6 lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Motif</Label>
                    <Select value={motifFilter} onValueChange={setMotifFilter}>
                      <SelectTrigger className="bg-white/10 dark:bg-black/10 backdrop-blur-sm h-11 border-white/20">
                        <SelectValue placeholder="Motif" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        <SelectItem value="all">Tous</SelectItem>
                        {allMotifs.map(motif => <SelectItem key={motif} value={motif}>{motif}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Nature</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-white/10 dark:bg-black/10 backdrop-blur-sm h-11 border-white/20">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="acte">Acte</SelectItem>
                        <SelectItem value="forfait">Forfait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white/10 dark:bg-black/10 backdrop-blur-sm h-11 border-white/20">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {historyMode ? (
                          <>
                            <SelectItem value="Validée,Refusée">Historique</SelectItem>
                            <SelectItem value="Validée">Validée</SelectItem>
                            <SelectItem value="Refusée">Refusée</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="En attente">En attente</SelectItem>
                            <SelectItem value="Validée">Validée</SelectItem>
                            <SelectItem value="Refusée">Refusée</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAdminView && (
                  <div className="md:col-span-12">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Utilisateur</Label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="bg-white/10 dark:bg-black/10 backdrop-blur-sm h-11 border-white/20">
                        <SelectValue placeholder="Choisir un membre" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        <SelectItem value="all">Tous les utilisateurs</SelectItem>
                        {allUsers.map(user => <SelectItem key={user.uid} value={user.uid}>{user.prenom} {user.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Vacations */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <PulseLoader />
          </div>
        ) : isMobile ? (
          <>
            <div className="space-y-4" {...handlers}>
              {vacations.length > 0 ? (
                vacations.map(v => (
                  <Card key={v.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden group">
                    <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between border-b border-white/10 mb-3">
                      <CardTitle className={cn("text-base font-bold truncate pr-2", isAdminView && "flex items-center")}>
                        {isAdminView && <UserRound className="h-4 w-4 mr-2 text-primary" />}
                        {isAdminView ? `${v.user?.prenom} ${v.user?.nom}` : String(v.patientName).toUpperCase()}
                        {v.isCec && (
                          <div className="inline-flex items-center ml-2">
                            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black px-1.5 py-0 animate-pulse">
                              CEC
                            </Badge>
                            {v.cecType && (
                              <span className="ml-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 opacity-80">
                                {v.cecType === 'CEC Clinique' ? 'CLIN' : 'ASST'}
                              </span>
                            )}
                          </div>
                        )}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild >
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4 opacity-70" />
                          </Button>
                        </DropdownMenuTrigger >
                        <DropdownMenuContent align="end" className="glass">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {archiveMode ? (
                            <DropdownMenuItem onClick={() => handleUnarchive(v.id)}>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Désarchiver
                            </DropdownMenuItem>
                          ) : (
                            <>
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
                              {isAdminView && v.status !== 'En attente' && (
                                <DropdownMenuItem onClick={() => handleArchive(v.id)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archiver
                                </DropdownMenuItem>
                              )}
                              {isAdminView && <DropdownMenuSeparator />}
                              <DropdownMenuItem onClick={() => handleEdit(v)} disabled={v.status !== 'En attente'}>
                                <FilePenLine className="mr-2 h-4 w-4" />Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive font-medium" onClick={() => setVacationToDelete(v)} disabled={v.status !== 'En attente'}>
                                <Trash2 className="mr-2 h-4 w-4" />Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2">
                      {isAdminView && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Patient:</span> <span className="font-semibold text-foreground pr-2" >{v.patientName}</span></div>}
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date:</span> <span className="font-semibold text-foreground pr-2">{format(new Date(v.date), 'd MMM yyyy', { locale: fr })} à {v.time}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Motif:</span> <span className="font-semibold text-foreground pr-2">{v.reason}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Acte:</span> <span className="font-semibold text-foreground pr-2 line-clamp-1">{v.operation}</span></div>
                      <div className="flex justify-between items-center py-1">
                        <div className="flex gap-2">
                          <Badge variant={v.type === 'acte' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-5">{v.type === 'acte' ? 'Acte' : 'Forfait'}</Badge>
                          <Badge className={cn(getStatusClasses(v.status), "text-[10px] px-1.5 h-5")}>{v.status}</Badge>
                        </div>
                        <span className="font-black text-primary pr-2">{v.amount.toFixed(2)} DT</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-12 glass shadow-sm rounded-3xl border border-white/10">
                  <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="h-8 w-8 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-bold">Aucun résultat</h3>
                  <p className="text-muted-foreground max-w-[250px] mx-auto mt-2">Nous n'avons trouvé aucune vacation correspondant à vos filtres.</p>
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                {Array.from({ length: totalPages }, (_, i) => (
                  <span key={i} className={cn("block h-1.5 w-6 rounded-full transition-all duration-300", currentPage === i + 1 ? 'bg-primary' : 'bg-primary/10')}></span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <VacationsTable
              vacations={vacations}
              isAdminView={isAdminView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onExport={exportValidatedToCSV}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              archiveMode={archiveMode}
            />
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Formulaire Dialogs */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={cn(
          "sm:max-w-xl bg-white dark:bg-zinc-950 shadow-2xl border-zinc-200 dark:border-zinc-800 p-0 flex flex-col max-h-[90vh] overflow-hidden",
          isMobile && "w-full h-full max-h-none rounded-none border-none"
        )}>
          <DialogHeader className="p-6 pb-2 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
            <DialogTitle className="text-2xl font-black text-gradient">{vacationToEdit ? 'Modifier la vacation' : 'Nouvelle vacation'}</DialogTitle>
            <DialogDescription>
              {vacationToEdit ? 'Mettez à jour les détails de l\'acte médical.' : 'Enregistrez une nouvelle vacation pour votre suivi.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            {user && (
              <VacationForm
                userId={user.uid}
                vacationToEdit={vacationToEdit}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
                isAdmin={isAdminView}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="bg-white dark:bg-zinc-950 shadow-2xl border-zinc-200 dark:border-zinc-800 max-w-[95vw] sm:max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient">Configuration du Rapport</DialogTitle>
          </DialogHeader>
          {user && userData && (
            <ReportGenerator
              allUsers={isAdminView ? allUsers : (userData ? [userData] : [])}
              currentUser={userData}
              isAdmin={isAdminView}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!vacationToDelete} onOpenChange={(open) => !open && setVacationToDelete(null)}>
        <AlertDialogContent className="!bg-white !text-zinc-950 shadow-2xl border-zinc-200 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-zinc-900">Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Cette action est irréversible. Voulez-vous vraiment supprimer cette vacation et l'effacer de votre historique ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-200 dark:border-zinc-800 rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 transition-all">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!archiveMode && !historyMode && !isAdminView && (
        <div className="fixed bottom-8 right-8 z-50 group">
          {/* Ripple Ring */}
          <span className="absolute -inset-2 rounded-full bg-primary/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></span>
          {/* Static Glow */}
          <div className="absolute -inset-1 bg-primary/40 rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />

          <Button
            onClick={handleAddNew}
            size="icon"
            className="relative h-14 w-14 rounded-full shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-110 active:scale-95 transition-all duration-300 bg-primary text-white"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
    </>
  );
}
