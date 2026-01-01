'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, User as UserIcon, MessageSquare, Archive, FolderClock } from 'lucide-react';


import { Button } from '@/components/ui/button';
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-11 w-11 rounded-full group p-0 hover:bg-transparent">
          <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-300 shadow-sm overflow-hidden ring-2 ring-primary/5 group-hover:ring-primary/10 ring-offset-2">
            <UserIcon className="h-5.5 w-5.5 opacity-90 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 glass border-white/20 shadow-2xl p-1.5" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black leading-none text-gradient">
              {userData.username}
            </p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 leading-none mt-1">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10 mx-2" />
        <DropdownMenuGroup className="p-1">
          {userData.role !== 'admin' && (
            <>
              <DropdownMenuItem asChild className="rounded-lg transition-all duration-200">
                <Link href="/dashboard" className="flex items-center">
                  <UserIcon className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-medium">Mon Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg transition-all duration-200">
                <Link href="/dashboard/historique-vacations" className="flex items-center">
                  <FolderClock className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-medium">Historique Vacations</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild className="rounded-lg transition-all duration-200">
            <Link href="/dashboard/messages" className="flex items-center">
              <MessageSquare className="mr-3 h-4 w-4 opacity-70" />
              <span className="font-medium">Messages</span>
            </Link>
          </DropdownMenuItem>
          {userData.role === 'admin' && (
            <>
              <DropdownMenuItem asChild className="rounded-lg transition-all duration-200">
                <Link href="/admin" className="flex items-center">
                  <LayoutDashboard className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-medium">Espace Administration</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg transition-all duration-200">
                <Link href="/admin/archives" className="flex items-center">
                  <Archive className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-medium">Vacations Archivées</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10 mx-2" />
        <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/5 transition-all duration-200 p-2.5">
          <LogOut className="mr-3 h-4 w-4" />
          <span className="font-bold">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
