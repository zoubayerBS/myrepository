'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import type { AppUser } from '@/types';
import { motion } from 'framer-motion';

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
  email: z.string().email().optional(),
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
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prenom: '',
      nom: '',
      username: '',
      email: '',
      password: '',
      fonction: undefined,
    },
  });

  const username = useWatch({
    control: form.control,
    name: "username",
  });

  useEffect(() => {
    if (username && username.length >= 3) {
      const sanitized = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      form.setValue('email', `${sanitized}@vacationapp.internal`);
    } else {
      form.setValue('email', '');
    }
  }, [username, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('[SIGNUP] Starting submission...', values.username);
    setIsLoading(true);
    try {
      const sanitized = values.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      const syntheticEmail = `${sanitized}@vacationapp.internal`.toLowerCase();

      console.log('[SIGNUP] Synthetic email generated:', syntheticEmail);

      const newUser = {
        username: values.username,
        password: values.password,
        email: syntheticEmail,
        prenom: values.prenom,
        nom: values.nom,
        fonction: values.fonction,
      };

      console.log('[SIGNUP] Calling API /api/auth/signup...');
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        let errorMsg = 'Une erreur est survenue lors de l\'inscription.';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error('[SIGNUP] Error parsing error response:', e);
        }

        console.error('[SIGNUP] API error:', errorMsg);
        toast({
          variant: 'destructive',
          title: 'Erreur d\'inscription',
          description: errorMsg,
        });
        return;
      }

      console.log('[SIGNUP] API success, parsing response...');
      const addedUser: AppUser = await response.json();

      // 4. Se connecter côté client pour établir la session (indispensable pour RLS)
      console.log('[SIGNUP] Attempting auto-login for session cookies...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: values.password,
      });

      if (signInError) {
        console.error('[SIGNUP] Auto-login error (non-fatal):', signInError.message);
      } else {
        console.log('[SIGNUP] Auto-login successful');
      }

      console.log('[SIGNUP] Updating auth context and navigating...');
      login(addedUser);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[SIGNUP] Unexpected error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: 'Une erreur inattendue est survenue.',
      });
    } finally {
      console.log('[SIGNUP] Submission finished');
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
          <CardTitle className="text-4xl font-black tracking-tight text-gradient">Créer un compte</CardTitle>
          <CardDescription className="text-sm font-medium mt-2">
            Rejoignez-nous ! Gérer vos vacations n'a jamais été aussi simple.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative p-8 pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Prénom</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jean"
                          className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nom</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dupont"
                          className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Identifiant</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Choisissez un username"
                        className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                        {...field}
                        autoComplete="off"
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
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium"
                        {...field}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fonction"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Spécialité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-primary/20 rounded-2xl transition-all duration-200 font-medium text-sm">
                          <SelectValue placeholder="Votre fonction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <SelectItem value="technicien d'anesthesie" className="text-sm">Technicien d'anesthésie</SelectItem>
                        <SelectItem value="instrumentiste" className="text-sm">Instrumentiste</SelectItem>
                        <SelectItem value="panseur" className="text-sm">Panseur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Finaliser l'inscription
                </Button>
              </div>
            </form>
          </Form>
          <div className="mt-8 text-center border-t border-primary/5 pt-6">
            <p className="text-xs font-medium text-muted-foreground/60">
              Vous avez déjà un compte ?{' '}
              <Link href="/login" className="text-primary font-black uppercase tracking-widest hover:underline transition-all">
                Se connecter
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}