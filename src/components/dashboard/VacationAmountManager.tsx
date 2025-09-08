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

const formSchema = z.object({
  amounts: z.array(
    z.object({
      fonction: z.string(),
      motif: z.string(),
      type: z.string(), // Added type
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
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Montants par Fonction, Motif et Type</CardTitle>
        <CardDescription>
          Modifiez les montants des vacations pour chaque combinaison de fonction, de motif et de type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonction / Motif / Type</TableHead>
                  {motifs.map(motif => (
                    <TableHead key={motif} colSpan={types.length} className="text-center border-l border-r">{motif}</TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  {motifs.map(motif => (
                    types.map(type => (
                      <TableHead key={`${motif}-${type}`} className="text-center border-l border-r">{type}</TableHead>
                    ))
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fonctions.map(fonction => (
                  <TableRow key={fonction}>
                    <TableCell className="font-medium capitalize">{fonction.replace(/_/g, ' ')}</TableCell>
                    {motifs.map(motif => (
                      types.map(type => {
                        const fieldIndex = getFieldIndex(fonction, motif, type);
                        if (fieldIndex === -1) return <TableCell key={`${motif}-${type}`}></TableCell>;
                        return (
                          <TableCell key={`${motif}-${type}`}>
                            <FormField
                              control={form.control}
                              name={`amounts.${fieldIndex}.amount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" {...field} className="w-24" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                        );
                      })
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour les montants
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
