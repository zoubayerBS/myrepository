import { useState, useEffect } from 'react';
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
import { findVacationsByUserIdAction, findAllVacationsAction } from '@/lib/actions/vacation-actions';

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
      vacation.amount.toFixed(0),
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
    foot: [[`Total pour ${title}`, '', '', '', '', '', `${groupTotal.toFixed(0)} DT`]],
    footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

const formSchema = z.object({
  userId: z.string().optional(),
  status: z.string(),
  motif: z.string(),
  dateRange: z.object({
    from: z.date({ required_error: 'Date de début requise.' }),
    to: z.date({ required_error: 'Date de fin requise.' }),
  }),
});

interface ReportGeneratorProps {
  allUsers: AppUser[];
  currentUser: AppUser;
  isAdmin: boolean;
  allVacations?: Vacation[];
}

export function ReportGenerator({ allUsers, currentUser, isAdmin, allVacations }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [reportVacations, setReportVacations] = useState<Vacation[]>([]);
  const [allMotifs, setAllMotifs] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsDataLoading(true);
      try {
        if (!allVacations) {
          const fetchAction = isAdmin ? findAllVacationsAction : () => findVacationsByUserIdAction(currentUser.uid);
          const { vacations } = await fetchAction({ limit: 9999 });
          setReportVacations(vacations || []);
        } else {
          setReportVacations(allVacations);
        }

        const motifsResponse = await fetch('/api/vacations/reasons');
        if (motifsResponse.ok) {
          const motifsData = await motifsResponse.json();
          setAllMotifs(motifsData);
        } else {
          console.error("Failed to fetch motifs");
        }
      } catch (error) {
        console.error("Failed to fetch data for report generator:", error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger les données pour le rapport.',
        });
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchData();
  }, [isAdmin, currentUser.uid, toast, allVacations]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: isAdmin ? 'all' : currentUser.uid,
      status: 'all',
      motif: 'all',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  });



  const generatePDF = (filteredData: Vacation[], selectedUser: AppUser | undefined, dateRange: { from: Date; to: Date }, status: string, motif: string) => {

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

    const motifText = `Motif: ${motif === 'all' ? 'Tous' : motif}`;

    doc.text(userText, 14, 46);

    doc.text(periodText, 14, 52);

    doc.text(motifText, 14, 58);



    const groupedByUser = filteredData.reduce((acc, v) => {

      acc[v.userId] = [...(acc[v.userId] || []), v];

      return acc;

    }, {} as Record<string, Vacation[]>);



    let finalY = 66;



    if (selectedUser) {

      const userVacations = groupedByUser[selectedUser.uid] || [];

      const cecVacations = userVacations.filter(v => v.isCec);

      const otherVacations = userVacations.filter(v => !v.isCec);



      finalY = createVacationTable(doc, "Vacations CEC", cecVacations, finalY);

      finalY = createVacationTable(doc, "Autres Vacations", otherVacations, finalY);



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

          totalValidatedAmount.toFixed(0)

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

              totalValidatedAmount.toFixed(0)

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

    doc.text(`Montant total: ${totalAmount.toFixed(0)} DT`, 14, finalY + 27);





    // Footer

    const pageCount = (doc as any).internal.getNumberOfPages();

    for (var i = 1; i <= pageCount; i++) {

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



      const filtered = reportVacations.filter(v => {

        // Exclude CEC vacations for the user 'zoubaier' from the entire report

        if (v.user && v.user.username === 'zoubaier_bs' && v.isCec) {

          return false;

        }



        const vacationDate = new Date(v.date);

        const userMatch = values.userId === 'all' || !values.userId || v.userId === values.userId;

        const dateMatch = vacationDate >= from && vacationDate <= toEndOfDay;

        const statusMatch = values.status === 'all' || v.status === values.status;

        const motifMatch = values.motif === 'all' || v.reason === values.motif;



        return userMatch && dateMatch && statusMatch && motifMatch;

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



      generatePDF(filtered, selectedUser, { from, to: toEndOfDay }, values.status, values.motif);



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



  if (isDataLoading) {

    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  }



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-6">
        <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Générer un Rapport d'Activité</h4>
        <p className="text-xs font-medium text-muted-foreground/80 lowercase">Utilisez les filtres ci-dessous pour extraire les données nécessaires au format PDF.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {isAdmin && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest ml-1">Utilisateur</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-primary/20 transition-all duration-200">
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card border-zinc-200 dark:border-zinc-800 shadow-2xl">
                        <SelectItem value="all" className="font-bold">Tous les utilisateurs</SelectItem>
                        {allUsers.map(user => (
                          <SelectItem key={user.uid} value={user.uid} className="font-medium">
                            {user.prenom} {user.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest ml-1">Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-primary/20 transition-all duration-200">
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card border-zinc-200 dark:border-zinc-800 shadow-2xl">
                      <SelectItem value="all" className="font-bold">Tous les statuts</SelectItem>
                      <SelectItem value="Validée" className="text-emerald-500 font-bold">Validée</SelectItem>
                      <SelectItem value="En attente" className="text-yellow-500 font-bold">En attente</SelectItem>
                      <SelectItem value="Refusée" className="text-destructive font-bold">Refusée</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motif"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest ml-1">Motif</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-primary/20 transition-all duration-200">
                        <SelectValue placeholder="Sélectionner un motif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card border-zinc-200 dark:border-zinc-800 shadow-2xl">
                      <SelectItem value="all" className="font-bold">Tous les motifs</SelectItem>
                      {allMotifs.map(reason => (
                        <SelectItem key={reason} value={reason} className="font-medium">{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1.5">
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest ml-1">Période d'activité</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                          'h-11 w-full justify-start text-left font-bold bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-primary/20 transition-all duration-200 group',
                          !field.value.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <span className="text-sm tracking-tight capitalize">
                              {format(field.value.from, 'dd MMM y', { locale: fr })} -{' '}
                              {format(field.value.to, 'dd MMM y', { locale: fr })}
                            </span>
                          ) : (
                            <span className="text-sm tracking-tight capitalize">{format(field.value.from, 'dd MMM y', { locale: fr })}</span>
                          )
                        ) : (
                          <span className="text-sm opacity-50">Choisir une période</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-card border-zinc-200 dark:border-zinc-800 shadow-2xl" align="center">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value.from}
                        selected={{ from: field.value.from, to: field.value.to }}
                        onSelect={(range) =>
                          field.onChange({ from: range?.from, to: range?.to })
                        }
                        numberOfMonths={1}
                        className="rounded-3xl"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all duration-200 gap-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
            Générer le Rapport PDF
          </Button>
        </form>
      </Form>
    </div>
  );
}
