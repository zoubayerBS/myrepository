
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getAllUsers } from '@/lib/local-data';
import type { AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const formSchema = z.object({
  receiverId: z.string().min(1, { message: "Veuillez sélectionner un destinataire." }),
  subject: z.string().min(1, { message: "Le sujet est requis." }).max(100, { message: "Le sujet est trop long." }),
  content: z.string().min(1, { message: "Le contenu est requis." }).max(1000, { message: "Le contenu est trop long." }),
});

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent: () => void;
}

export function NewMessageModal({ open, onOpenChange, onMessageSent }: NewMessageModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      receiverId: '',
      subject: '',
      content: '',
    },
  });

  useEffect(() => {
    async function fetchUsers() {
      if (open) {
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter(u => u.uid !== user?.uid));
      }
    }
    fetchUsers();
  }, [open, user]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.uid,
          receiverId: values.receiverId,
          subject: values.subject,
          content: values.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast({ title: 'Succès', description: 'Message envoyé.' });
      onMessageSent();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer le message.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 rounded-lg shadow-2xl">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="p-6 sm:p-10">
                <DialogHeader className="mb-6 sm:mb-10 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter text-gradient mb-2">
                        Nouveau Message
                      </DialogTitle>
                      <DialogDescription className="text-[10px] sm:text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                        Envoyez une communication sécurisée
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 max-w-[369px] mx-auto">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      <FormField
                        control={form.control}
                        name="receiverId"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Destinataire</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full h-14 bg-white/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-white/10 rounded-lg font-bold transition-all focus:ring-primary/20">
                                  <SelectValue placeholder="Choisir un collègue..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-lg border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 backdrop-blur-xl">
                                {users.map(u => (
                                  <SelectItem key={u.uid} value={u.uid} className="rounded-lg my-1 focus:bg-primary/5">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">
                                          {u.username.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-bold">{u.username}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Sujet</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Objet du message"
                                {...field}
                                className="w-full h-14 bg-white/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-white/10 rounded-lg font-bold transition-all focus:ring-primary/20"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Écrivez votre message ici..."
                              rows={8}
                              {...field}
                              className="w-full bg-white/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-white/10 rounded-lg font-medium p-6 transition-all focus:ring-primary/20 resize-none min-h-[150px] sm:min-h-[200px]"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold text-rose-500" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end items-center gap-4 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-14 px-8 rounded-lg font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-14 px-10 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Send className="mr-2 h-4 w-4 text-white" />
                        )}
                        Envoyer le message
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
