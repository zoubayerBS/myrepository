
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getAllUsers } from '@/lib/local-data';
import type { AppUser, Conversation } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, User, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  receiverId: z.string().min(1, { message: "Veuillez sélectionner un destinataire." }),
});

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export function NewConversationModal({ open, onOpenChange, onConversationCreated }: NewConversationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    async function fetchUsers() {
      if (open) {
        const allUsers = await getAllUsers();
        // Filter out the current user from the list
        setUsers(allUsers.filter(u => u.uid !== user?.uid));
      }
    }
    fetchUsers();
  }, [open, user]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant1Id: user.uid, participant2Id: values.receiverId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const newConversation = await response.json();
      toast({ title: 'Succès', description: 'Conversation démarrée.' });
      onConversationCreated(newConversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de démarrer la conversation.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:w-[400px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 rounded-3xl sm:rounded-[40px] shadow-2xl">
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
                  <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter text-gradient mb-2">
                    Nouvelle Conversation
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    Démarrez un échange avec un collaborateur
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-[265px] mx-auto">
                    <FormField
                      control={form.control}
                      name="receiverId"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Sélectionner un utilisateur</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full h-16 bg-white/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-white/10 rounded-2xl font-bold transition-all focus:ring-primary/20">
                                <SelectValue placeholder="Chercher un nom..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 backdrop-blur-xl">
                              {users.map(u => (
                                <SelectItem key={u.uid} value={u.uid} className="rounded-xl my-1 focus:bg-primary/5">
                                  <div className="flex items-center gap-3 py-1">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                                        {u.username.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-bold">{u.username}</span>
                                      <span className="text-[10px] font-medium text-muted-foreground/60">{u.fonction || 'Membre'}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px] font-bold text-rose-500" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end items-center gap-4 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                        ) : (
                          <MessageSquare className="mr-2 h-4 w-4 text-white" />
                        )}
                        Démarrer l'échange
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
