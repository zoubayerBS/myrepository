'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Surgeon } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Stethoscope, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
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


const formSchema = z.object({
  name: z.string().min(3, { message: 'Le nom doit contenir au moins 3 caractères.' }),
});

export function SurgeonManager() {
  const { toast } = useToast();
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [surgeonToDelete, setSurgeonToDelete] = useState<Surgeon | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const fetchSurgeons = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/surgeons');
      const data = await response.json();
      setSurgeons(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger la liste des chirurgiens.',
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSurgeons();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/surgeons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name }),
      });
      if (!response.ok) {
        throw new Error('Failed to add surgeon');
      }
      const newSurgeon = await response.json();
      setSurgeons((prev) => [...prev, newSurgeon].sort((a, b) => a.name.localeCompare(b.name)));
      form.reset();
      toast({
        title: 'Succès',
        description: `Le chirurgien "${values.name}" a été ajouté.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Ce nom existe peut-être déjà.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteSurgeon = async () => {
    if (!surgeonToDelete) return;

    try {
      const response = await fetch(`/api/surgeons/${surgeonToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete surgeon');
      }
      setSurgeons((prev) => prev.filter((s) => s.id !== surgeonToDelete.id));
      toast({
        title: 'Succès',
        description: `Le chirurgien "${surgeonToDelete.name}" a été supprimé.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'La suppression du chirurgien a échoué.',
      });
    } finally {
      setSurgeonToDelete(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Gérer les Chirurgiens</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        autoComplete='off'
                        placeholder="Nom du nouveau chirurgien"
                        className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} size="icon" className="h-11 w-11 shrink-0 rounded-xl shadow-lg shadow-primary/20">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
              </Button>
            </form>
          </Form>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
          ) : surgeons.length > 0 ? (
            surgeons.map((surgeon) => (
              <motion.div
                key={surgeon.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/50 hover:border-primary/20 hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <span className="font-bold tracking-tight text-sm">{surgeon.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
                  onClick={() => setSurgeonToDelete(surgeon)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Supprimer</span>
                </Button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl bg-zinc-50/50 dark:bg-white/5 border border-dashed border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-medium text-muted-foreground">Aucun chirurgien enregistré.</p>
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={!!surgeonToDelete} onOpenChange={(open) => !open && setSurgeonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera définitivement le chirurgien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSurgeon} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}