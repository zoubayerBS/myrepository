'use client';

import { Logo } from './Logo';
import { UserNav } from './UserNav';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import useSWR from 'swr';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Define a fetcher function for useSWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MessagePreview {
  id: string;
  senderName: string;
  subject: string;
  content: string;
  createdAt: string;
}

export function Header() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [isMessageDropdownOpen, setIsMessageDropdownOpen] = useState(false);

  // --- Message Logic ---
  // Fetch unread message count
  const { data: unreadMessageCountData, error: messageCountError, mutate: mutateMessageCount } = useSWR(
    userId ? `/api/messages/unread/count?userId=${userId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  const unreadMessageCount = unreadMessageCountData?.count || 0;

  // Fetch message previews when dropdown is open
  const { data: messagePreviewsData, error: messagePreviewsError, mutate: mutateMessagePreviews } = useSWR(
    isMessageDropdownOpen && userId ? `/api/messages/unread/preview?userId=${userId}&limit=5` : null,
    fetcher
  );
  const messagePreviews: MessagePreview[] = messagePreviewsData || [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass shadow-sm transition-all duration-300">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-6">
          <nav className="flex items-center">
            {/* Message Dropdown */}
            <DropdownMenu onOpenChange={setIsMessageDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-white/10 transition-colors duration-300">
                  <Mail className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-lg ring-2 ring-white/50 animate-bounce">
                      {unreadMessageCount}
                    </span>
                  )}
                  <span className="sr-only">Messages</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 glass border-white/20 shadow-2xl p-2 mt-2" align="end">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Messages non lus</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                    {unreadMessageCount} Nouveaux
                  </span>
                </div>
                <DropdownMenuSeparator className="bg-white/10 mx-1 mb-1.5" />
                <div className="space-y-1">
                  {messagePreviews.length > 0 ? (
                    messagePreviews.slice(0, 3).map((message) => (
                      <DropdownMenuItem key={message.id} className="flex flex-col items-start p-3 cursor-pointer rounded-xl hover:bg-white/10 transition-all duration-200">
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-black text-primary uppercase tracking-tighter">De: {message.senderName}</span>
                          <span className="text-[9px] text-muted-foreground/60 font-bold">{format(new Date(message.createdAt), 'HH:mm', { locale: fr })}</span>
                        </div>
                        <div className="text-sm font-bold tracking-tight mb-0.5">{message.subject}</div>
                        <div className="text-xs text-muted-foreground/70 line-clamp-1 italic">{message.content}</div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Mail className="h-8 w-8 mx-auto opacity-10 mb-2" />
                      <p className="text-xs font-bold text-muted-foreground/40">Aucun nouveau message</p>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-white/10 mx-1 mt-1.5" />
                <DropdownMenuItem asChild className="p-0 mt-1 focus:bg-transparent">
                  <Link
                    href="/dashboard/messages"
                    className="w-full text-center py-2.5 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                  >
                    Voir tous les messages
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-4 pl-4 border-l border-white/10">
              <UserNav />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}