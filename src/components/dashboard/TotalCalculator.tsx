'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, Wand2, Calculator, ArrowRightCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { findVacationsByUserId } from '@/lib/local-data';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

const formSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: 'Date de début requise.' }),
    to: z.date({ required_error: 'Date de fin requise.' }),
  }),
});

interface TotalCalculatorProps {
  userId: string;
  refreshKey?: number;
}

export function TotalCalculator({ userId: initialUserId, refreshKey }: TotalCalculatorProps) {
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

  useEffect(() => {
    if (totalAmount !== null && userId) {
      calculateTotal(form.getValues() as z.infer<typeof formSchema>, true);
    }
  }, [refreshKey]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  });

  async function calculateTotal(values: z.infer<typeof formSchema>, isBackground = false) {
    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Utilisateur non identifié.',
      });
      return;
    }

    if (!isBackground) {
      setIsLoading(true);
      setTotalAmount(null);
    }

    try {
      const fromStr = format(values.dateRange.from, 'yyyy-MM-dd');
      const toStr = format(values.dateRange.to, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/vacations?userId=${userId}&startDate=${fromStr}&endDate=${toStr}&statusFilter=Validée&limit=9999&t=${Date.now()}`
      );
      if (!response.ok) throw new Error('Fetch failed');
      const { vacations: filteredVacations } = await response.json();

      const total = (filteredVacations || []).reduce((sum: number, v: any) => sum + v.amount, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Erreur lors du calcul des totaux:', error);
      if (!isBackground) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de calculer le total.',
        });
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }

  if (!userId) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gradient flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculateur
        </CardTitle>
        <p className="text-xs text-muted-foreground">Calculez vos gains validés sur une période personnalisée.</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => calculateTotal(values))} className="space-y-6">
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-semibold mb-1">Période d'analyse</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal glass hover:bg-white/80 dark:hover:bg-black/50 border-white/20',
                          !field.value.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, 'dd MMM', { locale: fr })} - {format(field.value.to, 'dd MMM yyyy', { locale: fr })}
                            </>
                          ) : (
                            format(field.value.from, 'dd MMM yyyy', { locale: fr })
                          )
                        ) : (
                          <span>Choisir une période</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass shadow-2xl border-white/20" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value.from}
                        selected={{ from: field.value.from, to: field.value.to }}
                        onSelect={(range) =>
                          field.onChange({ from: range?.from, to: range?.to })
                        }
                        numberOfMonths={1}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full shadow-lg hover:shadow-primary/20 transition-all font-bold group">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
              )}
              {isLoading ? "Calcul en cours..." : "Calculer le total"}
            </Button>
          </form>
        </Form>

        <AnimatePresence>
          {totalAmount !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <ArrowRightCircle className="h-12 w-12" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total validé</p>
              <div className="text-4xl font-black text-primary">
                {totalAmount.toLocaleString('fr-TN', { minimumFractionDigits: 2 })}
                <span className="text-lg ml-1">DT</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-medium italic">
                Basé sur les vacations marquées comme "Validée"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}