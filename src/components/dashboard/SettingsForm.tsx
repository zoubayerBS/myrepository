'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  acteAmount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  forfaitAmount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
});

export function SettingsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      acteAmount: 0,
      forfaitAmount: 0,
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      setIsFetching(true);
      try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        form.reset({
          acteAmount: settings.acteAmount,
          forfaitAmount: settings.forfaitAmount,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger les paramètres actuels.',
        });
      } finally {
        setIsFetching(false);
      }
    }
    fetchSettings();
  }, [form, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        if (!response.ok) {
            throw new Error('Failed to update settings');
        }
        toast({
            title: 'Succès',
            description: 'Paramètres mis à jour.',
        });
    } catch (error) {
      console.error("Échec de la mise à jour des paramètres:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'La mise à jour des paramètres a échoué.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return <div className="text-sm text-muted-foreground">Chargement des paramètres...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h4 className="text-sm font-medium">Montants des vacations</h4>
        <div className="space-y-4">
            <FormField
            control={form.control}
            name="acteAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Montant "Acte" (DT)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="forfaitAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Montant "Forfait" (DT)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les montants
        </Button>
      </form>
    </Form>
  );
}