'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, User as UserIcon, MessageSquare, Archive, FolderClock} from 'lucide-react';


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

  const initials = (userData.username?.[0] ?? '').toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <div className="relative h-10 w-10 rounded-full flex items-center justify-center text-gray-800 text-xl font-semibold">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userData.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userData.role !== 'admin' && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Mon Dashboard </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/historique-vacations">
                  <FolderClock className="mr-2 h-4 w-4" />
                  <span>Historique Vacations</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/dashboard/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Messages</span>
            </Link>
          </DropdownMenuItem>
          {userData.role === 'admin' && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Espace Administration</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/archives">
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Vacations Archivées</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/pending-vacations">
                  <FolderClock className="mr-2 h-4 w-4" />
                  <span>Vacations en Attente</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
