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
import { MoreHorizontal, FilePenLine, Trash2, Download, CheckCircle, XCircle } from 'lucide-react';
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
import { sendMessage } from '@/lib/actions/message-actions'; // MODIFIED IMPORT
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VacationsTableProps {
  vacations: Vacation[];
  isAdminView?: boolean;
  onEdit: (vacation: Vacation) => void;
  onDelete: (vacationId: string) => Promise<void>;
  onStatusChange: (vacationId: string, status: VacationStatus) => Promise<void>;
  onExport: () => void;
}

export function VacationsTable({
  vacations,
  isAdminView = false,
  onEdit,
  onDelete,
  onStatusChange,
  onExport,
}: VacationsTableProps) {
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);
  const { user: adminUser } = useAuth();
  const isMobile = useIsMobile();

  const confirmDelete = () => {
    if (vacationToDelete) {
      onDelete(vacationToDelete.id).finally(() => setVacationToDelete(null));
    }
  };
  
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

  const handleStatusChangeAndNotify = async (vacationId: string, newStatus: VacationStatus) => {
    const vacation = vacations.find(v => v.id === vacationId);
    if (!vacation || !adminUser) return;

    try {
      const response = await fetch(`/api/vacations/${vacationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update vacation status');
      }
      const updatedVacation = await response.json();
      onStatusChange(vacationId, newStatus); // Update local state via prop

      const subject = `Mise à jour du statut de votre vacation`;
      const content = `Votre demande de vacation pour le ${format(new Date(vacation.date), 'dd/MM/yyyy', { locale: fr })} a été ${newStatus.toLowerCase()} par ${adminUser.username}.`;
      
      await sendMessage({
        senderId: adminUser.uid,
        receiverId: vacation.userId,
        subject,
        content,
      });

    } catch (error) {
      console.error("Error changing status or sending notification:", error);
    }
  };


  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={onExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter en CSV
        </Button>
      </div>
      
      {isMobile ? (
        <div className="space-y-4">
          {vacations.length > 0 ? (
            vacations.map((vacation) => (
              <Card key={vacation.id} className="p-4 w-full">
                <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    {vacation.patientName} ({vacation.operation})
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {isAdminView && (
                        <DropdownMenuItem onClick={() => handleStatusChangeAndNotify(vacation.id, vacation.status === 'Validée' ? 'En attente' : 'Validée')}> 
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          {vacation.status === 'Validée' ? 'Mettre en attente' : 'Valider'}
                        </DropdownMenuItem>
                      )}
                      {isAdminView && (
                        <DropdownMenuItem onClick={() => handleStatusChangeAndNotify(vacation.id, vacation.status === 'Refusée' ? 'En attente' : 'Refusée')}> 
                          <XCircle className="mr-2 h-4 w-4 text-red-500" />
                          {vacation.status === 'Refusée' ? 'Mettre en attente' : 'Refuser'}
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-0 text-sm overflow-x-auto">
                  {isAdminView && (
                    <div className="text-muted-foreground break-words">Utilisateur: <span className="font-medium text-foreground">{vacation.user?.prenom} {vacation.user?.nom}</span></div>
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
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdminView && <TableHead>Nom Complet</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant (DT)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacations.length > 0 ? (
                vacations.map((vacation) => (
                  <TableRow key={vacation.id} className={cn(vacation.isCec && 'bg-green-100')}>
                    {isAdminView && (
                      <TableCell className="font-medium">
                        {vacation.user?.prenom} {vacation.user?.nom}
                      </TableCell>
                    )}
                    <TableCell>
                      {format(new Date(vacation.date), 'd MMMM yyyy', { locale: fr })}
                    </TableCell>
                     <TableCell>{vacation.patientName}</TableCell>
                     <TableCell>{vacation.operation}</TableCell>
                     <TableCell>{vacation.reason}</TableCell>
                    <TableCell>
                      <Badge variant={vacation.type === 'acte' ? 'default' : 'secondary'}>
                        {vacation.type === 'acte' ? 'Acte' : 'Forfait'}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge className={cn('capitalize', getStatusClasses(vacation.status))}>
                        {vacation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{vacation.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {isAdminView && (
                             <DropdownMenuItem onClick={() => handleStatusChangeAndNotify(vacation.id, vacation.status === 'Validée' ? 'En attente' : 'Validée')}> 
                             <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                             {vacation.status === 'Validée' ? 'Mettre en attente' : 'Valider'}
                           </DropdownMenuItem>
                          )}
                          {isAdminView && (
                             <DropdownMenuItem onClick={() => handleStatusChangeAndNotify(vacation.id, vacation.status === 'Refusée' ? 'En attente' : 'Refusée')}> 
                             <XCircle className="mr-2 h-4 w-4 text-red-500" />
                             {vacation.status === 'Refusée' ? 'Mettre en attente' : 'Refuser'}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) 
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdminView ? 9 : 8} className="h-24 text-center">
                    Aucune vacation trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!vacationToDelete} onOpenChange={(open) => !open && setVacationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera définitivement la vacation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
