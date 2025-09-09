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
    <div className="space-y-4">
        <h4 className="text-sm font-medium">Gérer les Chirurgiens</h4>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormControl>
                        <Input autoComplete='off' placeholder="Nom du nouveau chirurgien" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" disabled={isLoading} size="icon" className="shrink-0">
                    <span className="sr-only">Ajouter</span>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                </Button>
            </form>
        </Form>
        <div className="space-y-2 rounded-md border p-2 h-48 overflow-y-auto">
            {isFetching ? (
                <p className="text-sm text-muted-foreground p-2">Chargement...</p>
            ) : surgeons.length > 0 ? (
                surgeons.map((surgeon) => (
                    <div key={surgeon.id} className="group flex items-center justify-between gap-2 p-2 text-sm rounded-md bg-secondary">
                        <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <span>{surgeon.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                            onClick={() => setSurgeonToDelete(surgeon)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground p-2">Aucun chirurgien enregistré.</p>
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