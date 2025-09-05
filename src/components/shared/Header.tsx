'use client';

import { Logo } from './Logo';
import { UserNav } from './UserNav';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import useSWR from 'swr';

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {/* Message Dropdown */}
            <DropdownMenu onOpenChange={setIsMessageDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Mail className="h-5 w-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {unreadMessageCount}
                    </span>
                  )}
                  <span className="sr-only">Messages</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 p-2 sm:w-auto" align="end">
                <div className="font-bold px-2 py-1">Messages non lus ({unreadMessageCount})</div>
                <DropdownMenuSeparator />
                {messagePreviews.length > 0 ? (
                  messagePreviews.map((message) => (
                    <DropdownMenuItem key={message.id} className="flex flex-col items-start p-2 cursor-pointer hover:bg-gray-100">
                      <div className="font-semibold">De: {message.senderName}</div>
                      <div className="text-sm font-medium">Sujet: {message.subject}</div>
                      <div className="text-xs text-gray-500 truncate w-full">{message.content}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(message.createdAt).toLocaleString()}</div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="text-center text-gray-500 p-2" disabled>
                    Aucun nouveau message
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/messages" className="w-full text-center text-blue-600 hover:underline">
                    Voir tous les messages
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}