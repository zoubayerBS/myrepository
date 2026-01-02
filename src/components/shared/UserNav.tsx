'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, User as UserIcon, MessageSquare, Archive, FolderClock } from 'lucide-react';


import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function UserNav() {
  const { userData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  if (!userData) {
    return null;
  }

  const initials = userData.prenom
    ? userData.prenom[0].toUpperCase()
    : userData.username.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-white/10 hover:ring-primary/20 transition-all p-0 overflow-hidden">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" alt={userData.username} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-600 text-white font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 glass border-white/20 shadow-2xl p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3 bg-white/5 rounded-xl mb-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black leading-none text-foreground">
                {userData.prenom} {userData.nom}
              </p>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-primary/20 text-primary uppercase border border-primary/10">
                {userData.role}
              </span>
            </div>
            <p className="text-xs leading-none text-muted-foreground font-medium truncate">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup className="space-y-1">
          {userData.role !== 'admin' && (
            <>
              <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer">
                <Link href="/dashboard" className="flex items-center py-2.5">
                  <div className="p-1.5 rounded-md bg-primary/10 mr-3 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Mon Dashboard</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Vue d'ensemble</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer">
                <Link href="/dashboard/historique-vacations" className="flex items-center py-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/10 mr-3 text-blue-500">
                    <FolderClock className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Historique</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Vos vacations archivées</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer">
            <Link href="/dashboard/messages" className="flex items-center py-2.5">
              <div className="p-1.5 rounded-md bg-amber-500/10 mr-3 text-amber-500">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">Messages</span>
                <span className="text-[10px] text-muted-foreground font-medium">Vos échanges</span>
              </div>
            </Link>
          </DropdownMenuItem>

          {userData.role === 'admin' && (
            <>
              <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer">
                <Link href="/admin" className="flex items-center py-2.5">
                  <div className="p-1.5 rounded-md bg-purple-500/10 mr-3 text-purple-500">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Administration</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Gérer la plateforme</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer">
                <Link href="/admin/archives" className="flex items-center py-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-500/10 mr-3 text-indigo-500">
                    <Archive className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Archives</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Historique global</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />

        <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2.5 group">
          <div className="p-1.5 rounded-md bg-destructive/10 mr-3 group-hover:bg-destructive/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-bold">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
