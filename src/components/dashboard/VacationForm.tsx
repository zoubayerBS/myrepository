'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Vacation, Surgeon, AppUser, VacationAmount } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Beaker, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

const formSchema = z.object({
  date: z.date({
    required_error: 'La date est requise.',
  }),
  time: z.string().min(1, "L'heure est requise."),
  patientName: z.string().min(1, "Le nom du patient est requis."),
  matricule: z.string().min(1, "Le matricule est requis."),
  surgeon: z.string().min(1, "Le nom du chirurgien est requis."),
  operation: z.string().min(1, "L'opération est requise."),
  reason: z.enum(['Astreinte A.M', 'Necessite du travail', 'Astreinte nuit', 'Astreinte matin'], {
    required_error: 'Le motif est requis.',
  }),
  type: z.enum(['acte', 'forfait'], {
    required_error: 'Le type de vacation est requis.',
  }),
  exceptionalAmount: z.number().optional(),
  isCec: z.boolean().optional(),
  cecType: z.enum(['Assistance CEC', 'CEC Clinique']).optional(),
}).refine(data => {
  if (data.isCec) {
    return !!data.cecType;
  }
  return true;
}, {
  message: "Le type CEC est requis.",
  path: ["cecType"],
});

interface VacationFormProps {
  userId: string;
  vacationToEdit?: Vacation | null;
  onSuccess: () => void;
  onCancel: () => void;
  isAdmin: boolean;
}

export function VacationForm({
  userId,
  vacationToEdit,
  onSuccess,
  onCancel,
  isAdmin,
}: VacationFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [surgeons, setSurgeons] = React.useState<Surgeon[]>([]);
  const [currentUser, setCurrentUser] = React.useState<AppUser | null>(null);
  const [vacationAmounts, setVacationAmounts] = React.useState<VacationAmount[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: vacationToEdit ? new Date(vacationToEdit.date) : new Date(),
      time: vacationToEdit?.time ?? '09:00',
      patientName: vacationToEdit?.patientName ?? '',
      matricule: vacationToEdit?.matricule ?? '',
      surgeon: vacationToEdit?.surgeon ?? '',
      operation: vacationToEdit?.operation ?? '',
      reason: vacationToEdit?.reason ?? 'Necessite du travail',
      type: vacationToEdit?.type ?? 'forfait',
      exceptionalAmount: vacationToEdit?.amount,
      isCec: vacationToEdit?.isCec ?? false,
      cecType: vacationToEdit?.cecType,
    },
  });

  const isCec = form.watch('isCec');

  React.useEffect(() => {
    async function fetchData() {
      const surgeonsResponse = await fetch('/api/surgeons');
      const fetchedSurgeons = await surgeonsResponse.json();
      setSurgeons(fetchedSurgeons);

      const userResponse = await fetch(`/api/users?uid=${userId}`);
      const fetchedUser = await userResponse.json();
      setCurrentUser(fetchedUser);

      const amountsResponse = await fetch('/api/vacation-amounts');
      const fetchedAmounts = await amountsResponse.json();
      setVacationAmounts(fetchedAmounts);
    }
    fetchData();
  }, [userId]);

  React.useEffect(() => {
    if (vacationToEdit) {
      form.reset({
        date: new Date(vacationToEdit.date),
        time: vacationToEdit.time,
        patientName: vacationToEdit.patientName,
        matricule: vacationToEdit.matricule,
        surgeon: vacationToEdit.surgeon,
        operation: vacationToEdit.operation,
        reason: vacationToEdit.reason,
        type: vacationToEdit.type,
        exceptionalAmount: vacationToEdit.amount,
        isCec: vacationToEdit.isCec ?? false,
        cecType: vacationToEdit.cecType ?? undefined,
      });
    } else {
      form.reset({
        date: new Date(),
        time: '09:00',
        patientName: '',
        matricule: '',
        surgeon: '',
        operation: '',
        reason: 'Necessite du travail',
        type: 'forfait',
        exceptionalAmount: undefined,
        isCec: false,
        cecType: undefined,
      });
    }
  }, [vacationToEdit]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (!currentUser) {
        throw new Error('User not found');
      }

      let amount;
      if (values.isCec) {
        if (values.cecType === 'Assistance CEC') {
          amount = 100;
        } else if (values.cecType === 'CEC Clinique') {
          amount = 300;
        } else {
          // This case should ideally be prevented by form validation
          throw new Error('Le type CEC est requis lorsque la vacation CEC est cochée.');
        }
      } else if (isAdmin && values.exceptionalAmount !== undefined && values.exceptionalAmount !== null) {
        amount = values.exceptionalAmount;
      } else {
        const selectedAmount = vacationAmounts.find(
          (va) => va.fonction === currentUser.fonction && va.motif === values.reason && va.type === values.type
        );

        if (!selectedAmount) {
          throw new Error('Amount for function, reason, and type not found');
        }
        amount = selectedAmount.amount;
      }

      const { exceptionalAmount, ...rest } = values; // Destructure exceptionalAmount
      const vacationData = {
        ...rest, // Use rest to exclude exceptionalAmount
        date: values.date.toISOString(),
        amount,
      };

      if (vacationToEdit) {
        const response = await fetch(`/api/vacations/${vacationToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...vacationData,
            userId: vacationToEdit.userId,
            status: vacationToEdit.status,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to update vacation');
        }
        toast({ title: 'Succès', description: 'Vacation mise à jour.' });
      } else {
        const response = await fetch('/api/vacations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...vacationData,
            userId,
            status: 'En attente' as const,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to add vacation');
        }
        const addedVacation = await response.json();
        toast({ title: 'Succès', description: 'Vacation ajoutée et en attente de validation.' });
      }
      onSuccess();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la vacation:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la vacation.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const labelStyles = "text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2 block px-1";
  const inputStyles = "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:border-primary/40 focus:ring-primary/10 transition-all duration-300 rounded-xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6 px-1"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-bold text-sm h-12',
                            inputStyles,
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-5 w-5 opacity-40" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        locale={fr}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Heure</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      autoComplete="off"
                      className={cn("h-12 font-bold text-sm", inputStyles)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelStyles}>Nom du Patient</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Saisissez le nom et le prénom du patient"
                        {...field}
                        autoComplete="off"
                        className={cn("h-12 font-bold text-sm", inputStyles)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="matricule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelStyles}>Matricule</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EX: 123456"
                        {...field}
                        autoComplete="off"
                        className={cn("h-12 font-bold text-sm", inputStyles)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="surgeon"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className={labelStyles}>Chirurgien</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-12 font-bold text-sm",
                            inputStyles,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? field.value
                            : "Sélectionner ou taper un nom"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl">
                      <Command shouldFilter={true} className="bg-transparent">
                        <CommandInput
                          placeholder="Rechercher un chirurgien..."
                          className="h-12 border-none focus:ring-0 bg-transparent font-medium"
                          onInput={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty className="p-4 text-sm font-medium opacity-50">Aucun chirurgien trouvé.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-[250px]">
                              {surgeons.map((surgeon) => (
                                <CommandItem
                                  value={surgeon.name}
                                  key={surgeon.id}
                                  className="flex items-center p-3 cursor-pointer hover:bg-white/10 transition-colors"
                                  onSelect={() => {
                                    form.setValue("surgeon", surgeon.name)
                                  }}
                                >
                                  <div className={cn(
                                    "mr-3 flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/5 transition-all duration-200",
                                    surgeon.name === field.value ? "bg-primary text-white border-primary" : "opacity-50"
                                  )}>
                                    <Check className={cn("h-3 w-3", surgeon.name === field.value ? "opacity-100" : "opacity-0")} />
                                  </div>
                                  <span className="font-bold text-sm">{surgeon.name}</span>
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Opération</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Appendicectomie"
                      {...field}
                      autoComplete="off"
                      className={cn("h-12 font-bold text-sm", inputStyles)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Motif</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn("h-12 font-bold text-sm", inputStyles)}>
                        <SelectValue placeholder="Sélectionner un motif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden p-1">
                      <SelectItem value="Astreinte A.M" className="rounded-xl font-bold p-3 focus:bg-primary/10">Astreinte A.M</SelectItem>
                      <SelectItem value="Astreinte matin" className="rounded-xl font-bold p-3 focus:bg-primary/10">Astreinte matin</SelectItem>
                      <SelectItem value="Necessite du travail" className="rounded-xl font-bold p-3 focus:bg-primary/10">Necessite du travail</SelectItem>
                      <SelectItem value="Astreinte nuit" className="rounded-xl font-bold p-3 focus:bg-primary/10">Astreinte nuit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Nature de l'acte</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn("h-12 font-bold text-sm", inputStyles)}>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden p-1">
                      <SelectItem value="acte" className="rounded-xl font-bold p-3 focus:bg-primary/10">Acte</SelectItem>
                      <SelectItem value="forfait" className="rounded-xl font-bold p-3 focus:bg-primary/10">Forfait</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {(isAdmin || currentUser?.uid?.includes('zoubaier') || currentUser?.username?.includes('zoubaier')) && (
            <motion.div
              layout
              className="space-y-4 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800"
            >
              <FormField
                control={form.control}
                name="isCec"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-4 space-y-0 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-5 w-5 border-zinc-300 dark:border-zinc-700 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-black uppercase tracking-widest cursor-pointer">
                        Vacation CEC
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <AnimatePresence>
                {isCec && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <FormField
                      control={form.control}
                      name="cecType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelStyles}>Type CEC</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className={cn("h-12 font-bold text-sm", inputStyles)}>
                                <SelectValue placeholder="Sélectionner un type CEC" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden p-1">
                              <SelectItem value="Assistance CEC" className="rounded-xl font-bold p-3 focus:bg-primary/10">Assistance CEC</SelectItem>
                              <SelectItem value="CEC Clinique" className="rounded-xl font-bold p-3 focus:bg-primary/10">CEC Clinique</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {isAdmin && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-inner">
              <FormField
                control={form.control}
                name="exceptionalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(labelStyles, "text-primary/70")}>Montant Exceptionnel (Admin)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Laisser vide pour le calcul auto"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        value={field.value ?? ''}
                        className={cn("h-12 font-bold text-sm", inputStyles, "border-primary/20 focus:border-primary/40")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="pt-6 flex items-center justify-end gap-3 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="font-black uppercase tracking-widest text-xs h-12 px-6 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
