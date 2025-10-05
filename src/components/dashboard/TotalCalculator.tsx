'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { findVacationsByUserId } from '@/lib/local-data';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

const formSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: 'Date de début requise.' }),
    to: z.date({ required_error: 'Date de fin requise.' }),
  }),
});

interface TotalCalculatorProps {
  userId: string; // Keep this prop, but it will be updated from auth context
}

export function TotalCalculator({ userId: initialUserId }: TotalCalculatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [userId, setUserId] = useState(initialUserId);

  useEffect(() => {
    if (user) {
      setUserId(user.uid);
    }
  }, [user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'Utilisateur non identifié.',
        });
        return;
    }

    setIsLoading(true);
    setTotalAmount(null);
    try {
      const allVacations = await findVacationsByUserId(userId);
      const { from, to } = values.dateRange;
      
      const filteredVacations = allVacations.filter(v => {
        const vacationDate = new Date(v.date);
        const dateMatch = isWithinInterval(vacationDate, { start: from, end: to });
        const statusMatch = v.status === 'Validée';
        return dateMatch && statusMatch;
      });

      const total = filteredVacations.reduce((sum, v) => sum + v.amount, 0);

      setTotalAmount(total);
    } catch (error) {
      console.error('Erreur lors du calcul des totaux:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de calculer le total.',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!userId) {
    return null; // Or a loading state
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent-foreground"/>
            Calculateur de Total
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value.from}
                        selected={{ from: field.value.from, to: field.value.to }}
                        onSelect={(range) =>
                            field.onChange({ from: range?.from, to: range?.to })
                        }
                        numberOfMonths={2}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Calculer le total
            </Button>
          </form>
        </Form>
        {totalAmount !== null && (
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">Montant total validé pour la période :</p>
            <p className="text-3xl font-bold text-primary">{totalAmount.toFixed(2)} DT</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}