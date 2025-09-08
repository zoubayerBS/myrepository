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
});

interface VacationFormProps {
  userId: string;
  vacationToEdit?: Vacation | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VacationForm({
  userId,
  vacationToEdit,
  onSuccess,
  onCancel,
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
    },
  });

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
      });
    }
  }, [vacationToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (!currentUser) {
        throw new Error('User not found');
      }

      console.log('currentUser.fonction:', currentUser.fonction);
      console.log('values.reason:', values.reason);
      console.log('values.type:', values.type);
      console.log('vacationAmounts:', vacationAmounts);

      const selectedAmount = vacationAmounts.find(
        (va) => va.fonction === currentUser.fonction && va.motif === values.reason && va.type === values.type
      );

      if (!selectedAmount) {
        throw new Error('Amount for function, reason, and type not found');
      }

      const amount = selectedAmount.amount;
      
      const vacationData = {
        ...values,
        date: values.date.toISOString(),
        amount,
      };

      if (vacationToEdit) {
        const response = await fetch(`/api/vacations/${vacationToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...vacationData,
            amount: amount, // Use the newly calculated amount
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

  return (
    <ScrollArea className="max-h-[80vh] pr-6 overflow-x-auto">
      <div className="py-4 px-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
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
                    <FormLabel>Heure</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Patient</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} autoComplete="off" />
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
                    <FormLabel>Matricule</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surgeon"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Chirurgien</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value
                                ? field.value
                                : "Sélectionner ou taper un nom"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command shouldFilter={true}>
                                <CommandInput 
                                    placeholder="Rechercher un chirurgien..."
                                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                                />
                                <CommandList>
                                <CommandEmpty>Aucun chirurgien trouvé.</CommandEmpty>
                                <CommandGroup>
                                    {surgeons.map((surgeon) => (
                                    <CommandItem
                                        value={surgeon.name}
                                        key={surgeon.id}
                                        onSelect={() => {
                                            form.setValue("surgeon", surgeon.name)
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            surgeon.name === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        {surgeon.name}
                                    </CommandItem>
                                    ))}
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
                    <FormLabel>Opération</FormLabel>
                    <FormControl>
                      <Input placeholder="Appendicectomie" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un motif" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Astreinte A.M">Astreinte A.M</SelectItem>
                        <SelectItem value="Astreinte matin">Astreinte matin</SelectItem>
                        <SelectItem value="Necessite du travail">Necessite du travail</SelectItem>
                        <SelectItem value="Astreinte nuit">Astreinte nuit</SelectItem>
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
                  <FormLabel>Nature de l\'acte</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="acte">Acte</SelectItem>
                      <SelectItem value="forfait">Forfait</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          
            <div className="pt-4 flex justify-between">
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Annuler
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </div>
            </div>
          </form>
        </Form>
      </div>
    </ScrollArea>
  );
}