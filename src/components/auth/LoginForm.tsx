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
import { motion } from 'framer-motion';

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Erreur de connexion',
          description: errorData.error || 'Identifiant ou mot de passe incorrect.',
        });
        setIsLoading(false);
        return;
      }

      const user: AppUser = await response.json();

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="border-none shadow-2xl glass-card overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <CardHeader className="relative p-8 pb-4">
          <CardTitle className="text-4xl font-black tracking-tight text-gradient">Connexion</CardTitle>
          <CardDescription className="text-sm font-medium mt-2">
            Ravi de vous revoir ! Accédez à votre espace sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative p-8 pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Identifiant</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="username"
                        placeholder="Votre nom d'utilisateur"
                        className="h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Se connecter
              </Button>
            </form>
          </Form>
          <div className="mt-8 text-center">
            <p className="text-xs font-medium text-muted-foreground/60">
              Pas encore membre ?{' '}
              <Link href="/signup" className="text-primary font-black uppercase tracking-widest hover:underline transition-all">
                Créer un compte
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
