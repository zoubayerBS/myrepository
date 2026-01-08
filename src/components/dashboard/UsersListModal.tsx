'use client';

import type { AppUser } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { Card } from '@/components/ui/card';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UsersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  onUserDelete: (userId: string) => void;
}

const pluralFonctions: Record<string, string> = {
  "technicien d'anesthesie": "Techniciens d'anesthesie",
  instrumentiste: "Instrumentistes",
  panseur: "Panseurs",
};

const fonctionColors: Record<string, string> = {
  "technicien d'anesthesie": "bg-blue-100 text-blue-800",
  instrumentiste: "bg-green-100 text-green-800",
  panseur: "bg-yellow-100 text-yellow-800",
};

export function UsersListModal({ isOpen, onClose, users, onUserDelete }: UsersListModalProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await onUserDelete(userToDelete.uid);
      toast({ title: 'Succès', description: 'Utilisateur supprimé.' });
      setUserToDelete(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer l\'utilisateur.' });
    }
  };

  const groupedUsers = users.reduce((acc, user) => {
    const { fonction } = user;
    if (!acc[fonction]) {
      acc[fonction] = [];
    }
    acc[fonction].push(user);
    return acc;
  }, {} as Record<string, AppUser[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("w-[95vw] sm:w-full max-w-xl p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900")}>

        <div className="relative">
          <DialogHeader className="p-4 sm:p-8 pb-4">
            <DialogTitle className="text-3xl font-black tracking-tight">Utilisateurs Actifs</DialogTitle>
            <DialogDescription className="font-medium">
              Gérez les accès et surveillez les membres actifs du système.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] max-h-[60vh] px-4 sm:px-8 pb-8">
            <div className="space-y-8">
              {Object.entries(groupedUsers).map(([fonction, usersInGroup], groupIndex) => (
                <div key={fonction} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                      {pluralFonctions[fonction] || fonction}
                    </h3>
                    <div className="h-px flex-1 bg-primary/10" />
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/10">
                      {usersInGroup.length}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {usersInGroup.map((user, uIdx) => (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: uIdx * 0.05 }}
                        className="group flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-primary/40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-sm ring-2 ring-primary/5 group-hover:ring-primary/20 transition-all duration-300">
                            <span className="font-black text-primary text-sm uppercase">
                              {user.prenom?.[0] ?? ''}{user.nom?.[0] ?? ''}
                            </span>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black tracking-tight truncate text-sm sm:text-base">{user.prenom} {user.nom}</p>
                            <div className="flex items-center gap-1 sm:gap-2 mt-0.5 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/40 leading-none flex-shrink-0">
                                {user.username}
                              </p>
                              <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                              <p className="text-[10px] font-bold text-muted-foreground/60 leading-none lowercase truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="!bg-white !text-zinc-950 shadow-2xl border border-zinc-200 rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black text-zinc-900">Confirmation de suppression</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium text-zinc-600">
                                Vous êtes sur le point de supprimer définitivement <span className="font-bold text-zinc-900">"{user.prenom} {user.nom}"</span>. Toutes ses données associées seront inaccessibles.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                              <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setUserToDelete(null)}>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20">
                                Supprimer l'utilisateur
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
