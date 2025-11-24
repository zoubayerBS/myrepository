'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { cn } from '@/lib/utils';
import type { AppUser, Vacation } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const createVacationTable = (doc: jsPDF, title: string, vacations: Vacation[], startY: number) => {
    if (vacations.length === 0) return startY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, startY);
    let tableStartY = startY + 8;

    const tableColumn = ["Date", "Patient", "Opération", "Motif", "Type", "Statut", "Montant (DT)"];
    const tableRows: (string | number)[][] = [];
    let groupTotal = 0;

    vacations.forEach(vacation => {
        const vacationData = [
            format(new Date(vacation.date), 'dd/MM/yy'),
            vacation.patientName,
            vacation.operation,
            vacation.reason,
            vacation.type === 'acte' ? 'Acte' : 'Forfait',
            vacation.status,
            vacation.amount.toFixed(2),
        ];
        tableRows.push(vacationData);
        groupTotal += vacation.amount;
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: tableStartY,
        theme: 'striped',
        headStyles: { fillColor: [41, 41, 41] },
        foot: [[`Total pour ${title}`, '', '', '', '', '', `${groupTotal.toFixed(2)} DT`]],
        footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

const formSchema = z.object({
  userId: z.string().optional(),
  status: z.string(),
  dateRange: z.object({
    from: z.date({ required_error: 'Date de début requise.' }),
    to: z.date({ required_error: 'Date de fin requise.' }),
  }),
});

interface ReportGeneratorProps {
  allVacations: Vacation[];
  allUsers: AppUser[];
  currentUser: AppUser;
  isAdmin: boolean;
}

export function ReportGenerator({ allVacations, allUsers, currentUser, isAdmin }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: isAdmin ? 'all' : currentUser.uid,
      status: 'all',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  });

  const generatePDF = (filteredData: Vacation[], selectedUser: AppUser | undefined, dateRange: { from: Date; to: Date }, status: string) => {
    const doc = new jsPDF();

    const statusText = status === 'all' ? 'Tous' : status;
    const title = `Rapport de Vacations (Statut: ${statusText})`;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const reportDate = `Généré le: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`;
    doc.text(reportDate, 200, 25, { align: 'right' });

    // Filter Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Filtres Appliqués', 14, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const userText = `Employé: ${selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : 'Tous les employés'}`;
    const periodText = `Période: Du ${format(dateRange.from, 'dd/MM/yyyy')} au ${format(dateRange.to, 'dd/MM/yyyy')}`;
    doc.text(userText, 14, 46);
    doc.text(periodText, 14, 52);

    const groupedByUser = filteredData.reduce((acc, v) => {
        acc[v.userId] = [...(acc[v.userId] || []), v];
        return acc;
    }, {} as Record<string, Vacation[]>);

    let finalY = 60;

    if (selectedUser) {
        const userVacations = groupedByUser[selectedUser.uid] || [];

        finalY = createVacationTable(doc, "Vacations", userVacations, finalY);

        // Add a new page for the summary of validated amounts per user
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Récapitulatif des Montants Validés', 105, 20, { align: 'center' });

        const summaryTableColumn = ["Employé", "Montant Total Validé (DT)"];
        const summaryTableRows: (string | number)[][] = [];

        const totalValidatedAmount = userVacations
            .filter(v => v.status === 'Validée')
            .reduce((sum, v) => sum + v.amount, 0);

        if (totalValidatedAmount > 0) {
            summaryTableRows.push([
                `${selectedUser.prenom} ${selectedUser.nom}`,
                totalValidatedAmount.toFixed(2)
            ]);
        }

        autoTable(doc, {
            head: [summaryTableColumn],
            body: summaryTableRows,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [41, 41, 41] },
        });

        finalY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        // All users report
        Object.entries(groupedByUser).forEach(([userId, userVacations]) => {
            const user = allUsers.find(u => u.uid === userId);
            if (!user) return;

            finalY = createVacationTable(doc, `${user.prenom} ${user.nom}`, userVacations, finalY);
        });

        // Add a new page for the summary of validated amounts per user
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Récapitulatif des Montants Validés par Utilisateur', 105, 20, { align: 'center' });

        const summaryTableColumn = ["Employé", "Montant Total Validé (DT)"];
        const summaryTableRows: (string | number)[][] = [];

        Object.entries(groupedByUser).forEach(([userId, userVacations]) => {
            const user = allUsers.find(u => u.uid === userId);
            if (user) {
                const totalValidatedAmount = userVacations
                    .filter(v => v.status === 'Validée')
                    .reduce((sum, v) => sum + v.amount, 0);

                if (totalValidatedAmount > 0) {
                    summaryTableRows.push([
                        `${user.prenom} ${user.nom}`,
                        totalValidatedAmount.toFixed(2)
                    ]);
                }
            }
        });

        autoTable(doc, {
            head: [summaryTableColumn],
            body: summaryTableRows,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [41, 41, 41] },
        });

        finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Summary
    const totalAmount = filteredData.reduce((sum, v) => sum + v.amount, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé Global', 14, finalY + 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre de vacations: ${filteredData.length}`, 14, finalY + 21);
    doc.text(`Montant total: ${totalAmount.toFixed(2)} DT`, 14, finalY + 27);


    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} sur ${pageCount}`, 105, 285, { align: 'center' });
    }

    // Open PDF in new tab instead of downloading
    doc.output('dataurlnewwindow');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        const { from, to } = values.dateRange;
        // Ensure the 'to' date includes the whole day
        const toEndOfDay = new Date(to);
        toEndOfDay.setHours(23, 59, 59, 999);

        const filtered = allVacations.filter(v => {
            const vacationDate = new Date(v.date);
            const userMatch = values.userId === 'all' || !values.userId || v.userId === values.userId;
            const dateMatch = vacationDate >= from && vacationDate <= toEndOfDay;
            const statusMatch = values.status === 'all' || v.status === values.status;
            const reasonMatch = v.reason !== 'Astreinte nuit';
            return userMatch && dateMatch && statusMatch && reasonMatch;
        });

        if (filtered.length === 0) {
            toast({
                variant: 'default',
                title: 'Aucune donnée',
                description: 'Aucune vacation ne correspond aux filtres sélectionnés.',
            });
            setIsLoading(false);
            return;
        }

        const selectedUser = allUsers.find(u => u.uid === values.userId);

        generatePDF(filtered, selectedUser, { from, to: toEndOfDay }, values.status);

    } catch (error) {
        console.error("Échec de la génération du rapport:", error);
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'La génération du rapport a échoué.',
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isAdmin && (
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Utilisateur</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {allUsers.map(user => (
                      <SelectItem key={user.uid} value={user.uid}>{user.prenom} {user.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Validée">Validée</SelectItem>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Refusée">Refusée</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Période</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !field.value.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value?.from ? (
                      field.value.to ? (
                        <>
                          {format(field.value.from, 'LLL dd, y', { locale: fr })} -{' '}
                          {format(field.value.to, 'LLL dd, y', { locale: fr })}
                        </>
                      ) : (
                        format(field.value.from, 'LLL dd, y', { locale: fr })
                      )
                    ) : (
                      <span>Choisir une période</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[100%] p-0" align="center">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value.from}
                    selected={{ from: field.value.from, to: field.value.to }}
                    onSelect={(range) =>
                        field.onChange({ from: range?.from, to: range?.to })
                    }
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          Générer le Rapport 
        </Button>
      </form>
    </Form>
  );
}
