'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { AppUser } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  prenom: z.string().min(2, { message: "Le prénom doit contenir au moins 2 caractères." }),
  nom: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  fonction: z.enum(['technicien d\'anesthesie', 'instrumentiste', 'panseur'], {
    errorMap: () => ({ message: "Veuillez sélectionner une fonction." }),
  }),
});

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prenom: '',
      nom: '',
      username: '',
      password: '',
      fonction: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const existingUserResponse = await fetch(`/api/users?username=${values.username}`);
      const existingUser: AppUser = await existingUserResponse.json();

      if (existingUser) {
        toast({
            variant: 'destructive',
            title: 'Erreur d\'inscription',
            description: 'Ce nom d\'utilisateur est déjà pris.',
        });
        setIsLoading(false);
        return;
      }
      
      const newUser: AppUser = {
        uid: `${Date.now()}-${values.username}`,
        username: values.username,
        password: values.password,
        email: `${values.username}@vacationease.app`,
        role: 'user',
        prenom: values.prenom,
        nom: values.nom,
        fonction: values.fonction,
      };

      const addUserResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!addUserResponse.ok) {
        throw new Error('Failed to add user');
      }

      login(newUser);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: 'Une erreur est survenue.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-3xl">Créer un compte</CardTitle>
        <CardDescription>
          Rejoignez VacationEase pour gérer vos vacations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Saisissez votre prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Saisissez votre nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <Input placeholder="Saisissez votre nom d'utilisateur" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fonction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez votre fonction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="technicien d'anesthesie">Technicien d'anesthésie</SelectItem>
                      <SelectItem value="instrumentiste">Instrumentiste</SelectItem>
                      <SelectItem value="panseur">Panseur</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              S'inscrire
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Déjà un compte ?{' '}
          <Link href="/login" className="underline text-primary">
            Se connecter
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}