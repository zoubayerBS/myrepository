'use client';

import { Bell, BellDot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NotificationBell() {
    const { user } = useAuth();
    const userId = user?.uid;
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // 1. Fetch unread count
    // Removed refreshInterval in favor of Realtime subscription
    const { data: countData, mutate: mutateCount } = useSWR(
        userId ? `/api/notifications/unread/count?userId=${userId}` : null,
        fetcher,
        {
            revalidateOnFocus: false // Don't revalidate on window focus to save calls, Realtime handles updates
        }
    );
    const unreadCount = countData?.count || 0;

    // 2. Fetch previews when open
    const { data: notificationsData, mutate: mutateNotifications } = useSWR<Notification[]>(
        isOpen && userId ? `/api/notifications/unread/preview?userId=${userId}&limit=100` : null,
        fetcher
    );
    const notifications = notificationsData || [];

    // 3. Realtime Subscription
    useEffect(() => {
        if (!userId) {
            return;
        }

        const supabase = createClient();

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload: any) => {
                    // Client-side filtering because server-side filter on quoted column "userId" is tricky
                    const targetUserId = payload.new?.userId || payload.new?.uid; // Fallback just in case
                    if (targetUserId && targetUserId !== userId) {
                        return;
                    }

                    // Refresh data when changes form
                    mutateCount();
                    // Also refresh list if open
                    if (isOpen) {
                        mutateNotifications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, isOpen, mutateCount, mutateNotifications]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
            // Updates local cache
            mutateCount();
            mutateNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        // Mark as read immediately
        handleMarkAsRead(notif.id);

        // Redirect logic if needed (e.g. if we had a link in the notification)
        // For now, most vac notifications are just info, but we can redirect to dashboard
        if (notif.type === 'vacation_status_change') {
            // Ideally scroll to the item or filter, but simpler is just go to dashboard
            // If we are already there, maybe refresh data?
            router.push('/dashboard');
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId || isClearing) return;
        setIsClearing(true);
        try {
            await fetch(`/api/notifications/clear-all?userId=${userId}`, { method: 'PUT' });
            mutateCount();
            mutateNotifications();
        } catch (e) {
            console.error(e);
        } finally {
            setIsClearing(false);
        }
    }

    return (
        <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-white/10 transition-colors duration-300">
                    <Bell className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg ring-2 ring-white/50 animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 glass border-white/20 shadow-2xl p-2 mt-2" align="end">
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                            {unreadCount} Nouvelles
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator className="bg-white/10 mx-1 mb-1.5" />

                <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
                    {notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent closing immediately to allow logic? No, we want to close usually.
                                    handleNotificationClick(notif);
                                }}
                                className="flex flex-col items-start p-3 cursor-pointer rounded-xl hover:bg-white/10 transition-all duration-200 focus:bg-white/10"
                            >
                                <div className="flex items-center justify-between w-full mb-1">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-tighter opacity-80 flex items-center gap-1",
                                        notif.type === 'vacation_status_change' ? 'text-primary' : 'text-zinc-500'
                                    )}>
                                        {notif.type === 'vacation_status_change' ? (
                                            <>
                                                <BellDot className="h-3 w-3" />
                                                STATUT VACATION
                                            </>
                                        ) : 'DIVERS'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60 font-bold">
                                        {format(new Date(notif.createdAt), 'dd MMM HH:mm', { locale: fr })}
                                    </span>
                                </div>
                                <div className="text-sm font-medium leading-snug text-foreground/90">{notif.message}</div>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Bell className="h-8 w-8 mx-auto opacity-10 mb-2" />
                            <p className="text-xs font-bold text-muted-foreground/40">Aucune nouvelle notification</p>
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator className="bg-white/10 mx-1 mt-1.5" />
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isClearing}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleMarkAllRead();
                                }}
                                className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Supprimer les notifications
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
