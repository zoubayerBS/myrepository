'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { getVacationAmounts, updateVacationAmounts } from '@/lib/local-data';
import type { VacationAmount } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const formSchema = z.object({
  amounts: z.array(
    z.object({
      fonction: z.enum(['technicien d\'anesthesie', 'instrumentiste', 'panseur'] as const),
      motif: z.enum(['Astreinte A.M', 'Necessite du travail', 'Astreinte nuit', 'Astreinte matin'] as const),
      type: z.enum(['acte', 'forfait'] as const),
      amount: z.coerce.number().min(0, { message: 'Le montant doit être positif.' }),
    })
  ),
});

const fonctions = ['technicien d\'anesthesie', 'instrumentiste', 'panseur'];
const motifs = ['Astreinte A.M', 'Necessite du travail', 'Astreinte nuit', 'Astreinte matin'];
const types = ['acte', 'forfait']; // Added types

export function VacationAmountManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amounts: [],
    },
  });

  useEffect(() => {
    async function fetchAmounts() {
      setIsFetching(true);
      try {
        const amounts = await getVacationAmounts();
        form.reset({ amounts });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger les montants.',
        });
      } finally {
        setIsFetching(false);
      }
    }
    fetchAmounts();
  }, [form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await updateVacationAmounts(values.amounts);
      toast({
        title: 'Succès',
        description: 'Les montants ont été mis à jour.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour les montants.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const getFieldIndex = (fonction: string, motif: string, type: string) => { // Added type
    return form.getValues('amounts').findIndex(a => a.fonction === fonction && a.motif === motif && a.type === type);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-4">
        <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Gestion des Tarifs</h4>
        <p className="text-xs font-medium text-muted-foreground/80 lowercase">Modifiez les montants pour chaque combinaison de fonction, motif et type.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6">
            {fonctions.map((fonction, fIdx) => (
              <motion.div
                key={fonction}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fIdx * 0.1 }}
                className="rounded-3xl bg-white/30 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 p-6 overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                <h5 className="font-black tracking-widest text-[10px] uppercase text-primary mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {fonction}
                </h5>

                <div className="grid gap-8">
                  {motifs.map((motif) => (
                    <div key={motif} className="space-y-4">
                      <div className="text-xs font-bold text-muted-foreground/80 uppercase tracking-tighter flex items-center gap-2">
                        {motif}
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {types.map((type) => {
                          const fieldIndex = getFieldIndex(fonction, motif, type);
                          if (fieldIndex === -1) return null;
                          return (
                            <div key={type} className="flex-1 min-w-[200px]">
                              <FormField
                                control={form.control}
                                name={`amounts.${fieldIndex}.amount`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <FormLabel className="text-[11px] font-black uppercase text-muted-foreground/50 tracking-widest">{type}</FormLabel>
                                    </div>
                                    <FormControl>
                                      <div className="relative group">
                                        <Input
                                          type="number"
                                          {...field}
                                          className="h-10 pl-3 pr-10 font-bold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-primary/20 transition-all duration-200 group-hover:border-primary/30"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 group-focus-within:text-primary transition-colors">
                                          DT
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="sticky bottom-0 pt-6 pb-2 bg-gradient-to-t from-white dark:from-zinc-950 via-white/90 dark:via-zinc-950/90 to-transparent">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sauvegarder les nouveaux tarifs"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
