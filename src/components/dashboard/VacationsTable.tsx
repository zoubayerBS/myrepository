'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, FilePenLine, Trash2, Download, CheckCircle, XCircle, Archive, ArchiveRestore, User, Calendar, Clock, Stethoscope, Briefcase, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Vacation, VacationStatus } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface VacationsTableProps {
  vacations: Vacation[];
  isAdminView?: boolean;
  onEdit: (vacation: Vacation) => void;
  onDelete: (vacationId: string) => Promise<void>;
  onStatusChange: (vacationId: string, status: VacationStatus) => Promise<void>;
  onExport: () => void;
  onArchive: (vacationId: string) => Promise<void>;
  onUnarchive: (vacationId: string) => Promise<void>;
  archiveMode?: boolean;
}

export function VacationsTable({
  vacations,
  isAdminView = false,
  onEdit,
  onDelete,
  onStatusChange,
  onExport,
  onArchive,
  onUnarchive,
  archiveMode = false,
}: VacationsTableProps) {
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);
  const isMobile = useIsMobile();

  const confirmDelete = () => {
    if (vacationToDelete) {
      onDelete(vacationToDelete.id).finally(() => setVacationToDelete(null));
    }
  };

  const getStatusConfig = (status: VacationStatus) => {
    switch (status) {
      case 'Validée':
        return {
          className: 'bg-green-500/10 text-green-600 border-green-200/50 dark:border-green-500/20',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case 'Refusée':
        return {
          className: 'bg-red-500/10 text-red-600 border-red-200/50 dark:border-red-500/20',
          icon: <XCircle className="h-3 w-3 mr-1" />
        };
      case 'En attente':
      default:
        return {
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:border-yellow-500/20',
          icon: <Activity className="h-3 w-3 mr-1" />
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 dark:border-white/10 shadow-sm">
        <h2 className="text-xl font-bold text-gradient flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          {archiveMode ? "Archives des Vacations" : "Vos Vacations"}
        </h2>
        <Button onClick={onExport} variant="outline" className="glass hover:bg-white/80 dark:hover:bg-black/50 transition-all border-primary/20">
          <Download className="mr-2 h-4 w-4 text-primary" />
          Exporter CSV
        </Button>
      </div>

      {isMobile ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {vacations.length > 0 ? (
            vacations.map((vacation, index) => (
              <motion.div
                key={vacation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card overflow-hidden">
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    vacation.needsReview
                      ? "bg-amber-500"
                      : getStatusConfig(vacation.status).className.split(' ')[0].replace('/10', '')
                  )} />
                  <CardHeader className="p-4 flex flex-row items-start justify-between gap-3 relative overflow-hidden">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-center justify-center min-w-[3.5rem] h-14 bg-white/5 dark:bg-black/10 rounded-xl border border-white/10 overflow-hidden shadow-inner">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground bg-white/50 dark:bg-black/20 w-full text-center py-0.5">
                          {format(new Date(vacation.date), 'MMM', { locale: fr })}
                        </span>
                        <span className="text-xl font-black text-foreground">
                          {format(new Date(vacation.date), 'dd')}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg font-bold truncate leading-none">
                            {vacation.patientName}
                          </CardTitle>
                          {vacation.isCec && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white border-0 text-[9px] font-black px-1.5 py-0 h-4 shadow-sm shadow-emerald-500/20">
                              CEC
                            </Badge>
                          )}
                          {vacation.needsReview && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 text-white border-0 text-[9px] font-black px-1.5 py-0 h-4 shadow-sm">
                              Cas Particulier
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium truncate mt-1 flex items-center gap-1.5">
                          {getStatusConfig(vacation.status).icon}
                          <span>{vacation.status}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {archiveMode ? (
                          <DropdownMenuItem onClick={() => onUnarchive(vacation.id)}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Désarchiver
                          </DropdownMenuItem>
                        ) : (
                          <>
                            {isAdminView && (
                              <DropdownMenuItem onClick={() => onStatusChange(vacation.id, vacation.status === 'Validée' ? 'En attente' : 'Validée')}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                {vacation.status === 'Validée' ? 'En attente' : 'Valider'}
                              </DropdownMenuItem>
                            )}
                            {isAdminView && (
                              <DropdownMenuItem onClick={() => onStatusChange(vacation.id, vacation.status === 'Refusée' ? 'En attente' : 'Refusée')}>
                                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                {vacation.status === 'Refusée' ? 'En attente' : 'Refuser'}
                              </DropdownMenuItem>
                            )}
                            {isAdminView && vacation.status !== 'En attente' && (
                              <DropdownMenuItem onClick={() => onArchive(vacation.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archiver
                              </DropdownMenuItem>
                            )}
                            {isAdminView && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={() => onEdit(vacation)}
                              disabled={vacation.status !== 'En attente'}
                            >
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setVacationToDelete(vacation)}
                              disabled={vacation.status !== 'En attente'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">

                    </div>
                    <div className="bg-white/5 dark:bg-black/20 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Opération</div>
                      <div className="font-medium text-sm leading-snug">{vacation.operation}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{vacation.time}</span>
                      </div>
                      <div className="text-lg font-bold text-primary">{vacation.amount.toFixed(2)} <span className="text-[10px]">DT</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center p-12 glass rounded-2xl border-dashed border-2 opacity-50">
              Aucune vacation trouvée.
            </div>
          )}
        </motion.div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent border-white/20">
                {isAdminView && <TableHead className="font-bold py-4">Utilisateur</TableHead>}
                <TableHead className="font-bold">Date & Heure</TableHead>
                <TableHead className="font-bold">Patient</TableHead>
                <TableHead className="font-bold">Opération</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Statut</TableHead>
                <TableHead className="text-right font-bold w-[120px]">Montant</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {vacations.length > 0 ? (
                  vacations.map((vacation, index) => (
                    <motion.tr
                      layout
                      key={vacation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "group hover:bg-primary/5 transition-colors border-white/10",
                        vacation.isCec && 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20',
                        vacation.needsReview && 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20'
                      )}
                    >
                      {isAdminView && (
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {vacation.needsReview && (
                              <div title={`Note: ${vacation.specialNote}`} className="cursor-help">
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              </div>
                            )}
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                              {vacation.user?.prenom?.[0]}{vacation.user?.nom?.[0]}
                            </div>
                            <span>{vacation.user?.prenom} {vacation.user?.nom}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{format(new Date(vacation.date), 'd MMMM yyyy', { locale: fr })}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {vacation.time}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold uppercase tracking-tight text-primary/80">{vacation.patientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="max-w-[200px] truncate" title={vacation.operation}>
                            {vacation.operation}
                          </div>
                          {vacation.isCec && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-[10px] font-black px-1.5 py-0">
                              CEC
                            </Badge>
                          )}
                          {vacation.needsReview && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[10px] font-black px-1.5 py-0 shadow-sm cursor-help" title={vacation.specialNote}>
                              À Revoir
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "border-primary/20 bg-primary/5 text-primary",
                          vacation.type === 'acte' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-purple-200 bg-purple-50 text-purple-700'
                        )}>
                          {vacation.type === 'acte' ? 'Acte' : 'Forfait'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('capitalize border px-2 py-1', getStatusConfig(vacation.status).className)}>
                          {getStatusConfig(vacation.status).icon}
                          {vacation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary">
                        {vacation.amount.toFixed(2)} <span className="text-[10px] font-normal">DT</span>
                        {vacation.needsReview && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                            Suggéré
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass shadow-2xl">
                            {vacation.needsReview && isAdminView && (
                              <>
                                <DropdownMenuLabel className="text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded-md mb-1 text-xs">
                                  Note: {vacation.specialNote}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {archiveMode ? (
                              <DropdownMenuItem onClick={() => onUnarchive(vacation.id)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Désarchiver
                              </DropdownMenuItem>
                            ) : (
                              <>
                                {isAdminView && (
                                  <DropdownMenuItem onClick={() => onStatusChange(vacation.id, vacation.status === 'Validée' ? 'En attente' : 'Validée')}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    {vacation.status === 'Validée' ? 'En attente' : 'Valider'}
                                  </DropdownMenuItem>
                                )}
                                {isAdminView && (
                                  <DropdownMenuItem onClick={() => onStatusChange(vacation.id, vacation.status === 'Refusée' ? 'En attente' : 'Refusée')}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    {vacation.status === 'Refusée' ? 'En attente' : 'Refuser'}
                                  </DropdownMenuItem>
                                )}
                                {isAdminView && vacation.status !== 'En attente' && (
                                  <DropdownMenuItem onClick={() => onArchive(vacation.id)}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archiver
                                  </DropdownMenuItem>
                                )}
                                {isAdminView && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => onEdit(vacation)}
                                  disabled={vacation.status !== 'En attente'}
                                >
                                  <FilePenLine className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive font-medium"
                                  onClick={() => setVacationToDelete(vacation)}
                                  disabled={vacation.status !== 'En attente'}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdminView ? 8 : 7} className="h-48 text-center bg-white/5 mx-4 rounded-xl">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Briefcase className="h-8 w-8 text-primary/40" />
                        <p className="font-bold">Aucune vacation trouvée.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!vacationToDelete} onOpenChange={(open) => !open && setVacationToDelete(null)}>
        <AlertDialogContent className="bg-white !text-zinc-950 shadow-2xl border-zinc-200 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Cette action est irréversible. La vacation pour <strong className="text-zinc-900">{vacationToDelete?.patientName}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-200 dark:border-zinc-800 rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}