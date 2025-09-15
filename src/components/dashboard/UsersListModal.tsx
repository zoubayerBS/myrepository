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
      <DialogContent className={cn("w-full max-w-md", isMobile && "max-w-[90vw]")}>
        <DialogHeader>
          <DialogTitle>Utilisateurs Actifs</DialogTitle>
          <DialogDescription>
            Liste de tous les utilisateurs actifs dans le système.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
            <div className="py-4">
            {Object.entries(groupedUsers).map(([fonction, usersInGroup], groupIndex) => (
                <div key={fonction}>
                    <Card className={`p-2 my-2 ${fonctionColors[fonction] || 'bg-gray-100 text-gray-800'}`}>
                        <h3 className="text-md font-semibold">{pluralFonctions[fonction] || fonction}</h3>
                    </Card>
                    <div className="grid gap-4 py-2">
                        {usersInGroup.map(user => (
                            <div key={user.uid} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <span className="font-semibold text-gray-600">{user.prenom?.[0] ?? ''}{user.nom?.[0] ?? ''}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{user.prenom} {user.nom}</p>
                                        <p className="text-sm text-muted-foreground">{user.fonction.charAt(0).toUpperCase() + user.fonction.slice(1)}</p>
                                    </div>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="text-red-500 hover:text-red-700" onClick={() => setUserToDelete(user)}>
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est irréversible et supprimera définitivement l'utilisateur.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Annuler</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                    {groupIndex < Object.entries(groupedUsers).length - 1 && <Separator className="my-4" />}
                </div>
            ))}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
