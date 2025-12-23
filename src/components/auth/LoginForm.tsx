'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

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
import type { AppUser } from '@/types';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userResponse = await fetch(`/api/users?username=${values.username}`);
      const user: AppUser = await userResponse.json();

      if (!user || !user.password) {
        toast({
          variant: 'destructive',
          title: 'Erreur de connexion',
          description: 'Nom d\'utilisateur ou mot de passe incorrect.',
        });
        setIsLoading(false);
        return;
      }

      const isPasswordValid = (values.password === user.password);

      if (!isPasswordValid) {
        toast({
          variant: 'destructive',
          title: 'Erreur de connexion',
          description: 'Nom d\'utilisateur ou mot de passe incorrect.',
        });
        setIsLoading(false);
        return;
      }

      login(user);
      toast({
        title: 'Connexion réussie',
        description: user.role === 'admin' ? 'Bienvenue sur votre espace admin.' : 'Bienvenue sur votre tableau de bord.',
      });
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: 'Une erreur inattendue est survenue.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-3xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre tableau de bord VacationEase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <Input placeholder="Saisissez votre nom d'utilisateur" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Se connecter
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="underline text-primary">
            S'inscrire
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
