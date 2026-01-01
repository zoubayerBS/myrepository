'use client';

import { useAuth } from '@/lib/auth';
import { Message } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus, Archive, ArchiveRestore, Trash2, Inbox, Send, Search, Star, Clock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NewMessageModal } from '@/components/dashboard/messages/NewMessageModal';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ✅ Composant enfant pour un message swipeable
function SwipeableMessageItem({
  msg,
  activeTab,
  selectedMessage,
  onClick,
  setItemToArchive,
  setItemToDelete,
  swipedItemId,
  setSwipedItemId,
  swipeProgress,
  setSwipeProgress,
}: {
  msg: Message;
  activeTab: string;
  selectedMessage: Message | null;
  onClick: (message: Message) => void;
  setItemToArchive: (item: Message | null) => void;
  setItemToDelete: (item: Message | null) => void;
  swipedItemId: string | null;
  setSwipedItemId: (id: string | null) => void;
  swipeProgress: number;
  setSwipeProgress: (progress: number) => void;
}) {
  const handlers = useSwipeable({
    onSwiping: (event) => {
      if (activeTab === 'archived') return;
      setSwipedItemId(msg.id);
      setSwipeProgress(event.deltaX);
    },
    onSwiped: () => {
      if (swipeProgress < -100) {
        setItemToDelete(msg);
      } else if (swipeProgress > 100) {
        setItemToArchive(msg);
      }
      setSwipedItemId(null);
      setSwipeProgress(0);
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const isSwiped = swipedItemId === msg.id;
  const isSelected = selectedMessage?.id === msg.id;
  const isUnread = !msg.read && activeTab === 'received';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group mb-2"
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-between px-6 rounded-3xl transition-all duration-300",
          swipeProgress > 0 ? "bg-amber-500/90" : "bg-rose-500/90",
          isSwiped ? "opacity-100" : "opacity-0"
        )}
      >
        <Archive className={cn("h-6 w-6 text-white transition-transform", swipeProgress > 50 ? "scale-110" : "scale-100")} />
        <Trash2 className={cn("h-6 w-6 text-white transition-transform", swipeProgress < -50 ? "scale-110" : "scale-100")} />
      </div>

      <motion.div
        {...handlers}
        style={{ x: isSwiped ? swipeProgress : 0 }}
        onClick={() => onClick(msg)}
        className={cn(
          "relative z-10 p-4 transition-all duration-300 cursor-pointer rounded-3xl border",
          isSelected
            ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
            : "bg-white/40 dark:bg-white/5 border-zinc-200/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:border-primary/20 shadow-sm",
          isUnread && !isSelected && "ring-1 ring-primary/20 bg-primary/5"
        )}
      >
        <div className="flex items-start gap-4">
          <Avatar className={cn(
            "h-12 w-12 border-2 transition-all",
            isSelected ? "border-white/20" : "border-transparent group-hover:border-primary/10"
          )}>
            <AvatarFallback className={cn(
              "font-black",
              isSelected ? "bg-white/20 text-white" : "bg-primary/5 text-primary"
            )}>
              {msg.senderName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className={cn(
                "font-black tracking-tight truncate",
                isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100",
                isUnread && !isSelected && "text-primary"
              )}>
                {activeTab === 'sent' ? `À: ${msg.receiverName}` : msg.senderName}
              </span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tighter shrink-0 ml-2",
                isSelected ? "text-white/60" : "text-zinc-400"
              )}>
                {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
              </span>
            </div>

            <h4 className={cn(
              "text-xs font-bold truncate leading-relaxed mb-0.5",
              isSelected ? "text-white/90" : "text-zinc-600 dark:text-zinc-400"
            )}>
              {msg.subject}
            </h4>

            <p className={cn(
              "text-[11px] font-medium line-clamp-2 opacity-60",
              isSelected ? "text-white/70" : "text-zinc-500"
            )}>
              {msg.content}
            </p>
          </div>

          {isUnread && !isSelected && (
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shadow-sm shadow-primary/50" />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ✅ Page principale
export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [itemToDelete, setItemToDelete] = useState<Message | null>(null);
  const [itemToArchive, setItemToArchive] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMessages = (type: string) => {
    if (user) {
      setLoading(true);
      setError(null);
      let apiUrl = `/api/messages?userId=${user.uid}&type=${type}`;

      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch messages');
          return res.json();
        })
        .then((data) => {
          setMessages(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          setError('Impossible de charger les messages. Veuillez réessayer.');
        });
    }
  };

  useEffect(() => {
    fetchMessages(activeTab);
  }, [user, activeTab]);

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.read) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, read: 1 } : m))
      );
      fetch(`/api/messages/${message.id}/read`, { method: 'PUT' });
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m =>
      m.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.receiverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const handleMessageSent = () => {
    fetchMessages('sent');
    setIsModalOpen(false);
  };

  const handleArchiveToggle = async (messageId: string, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });
      if (!response.ok) throw new Error();
      fetchMessages(activeTab);
      setSelectedMessage(null);
    } catch {
      console.error('Error archiving/unarchiving message');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      fetchMessages(activeTab);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8",
        selectedMessage ? "hidden lg:flex" : "flex"
      )}>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Messages</h1>
          <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Gérez vos communications internes</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
        >
          <FilePlus className="mr-2 h-5 w-5" />
          Nouveau Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden relative">
        {/* Sidebar: Message List */}
        <div className={cn(
          "lg:col-span-4 flex flex-col min-h-0 transition-all duration-500",
          selectedMessage ? "hidden lg:flex" : "flex"
        )}>
          <div className="bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[32px] border border-zinc-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-zinc-200 dark:border-white/5 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 p-1.5 bg-zinc-100/50 dark:bg-zinc-950/50 rounded-2xl h-12">
                  <TabsTrigger value="received" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Reçus</TabsTrigger>
                  <TabsTrigger value="sent" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Envoyés</TabsTrigger>
                  <TabsTrigger value="archived" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Archivés</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200/50 dark:border-white/10 rounded-2xl font-medium"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-2">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg) => (
                      <SwipeableMessageItem
                        key={msg.id}
                        msg={msg}
                        activeTab={activeTab}
                        selectedMessage={selectedMessage}
                        onClick={handleMessageClick}
                        setItemToArchive={setItemToArchive}
                        setItemToDelete={setItemToDelete}
                        swipedItemId={swipedItemId}
                        setSwipedItemId={setSwipedItemId}
                        swipeProgress={swipeProgress}
                        setSwipeProgress={setSwipeProgress}
                      />
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-20 text-center"
                    >
                      <div className="inline-flex p-4 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-dashed border-zinc-200 dark:border-white/10 mb-4">
                        <Inbox className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <p className="text-xs font-black text-muted-foreground/30 uppercase tracking-widest">Aucun message</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* content: Message Viewer */}
        <div className={cn(
          "lg:col-span-8 flex flex-col min-h-0 transition-all duration-500",
          !selectedMessage ? "hidden lg:flex" : "flex"
        )}>
          <div className="bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[32px] border border-zinc-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col h-full relative">
            <AnimatePresence mode="wait">
              {selectedMessage ? (
                <motion.div
                  key={selectedMessage.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                  <div className="p-6 lg:p-8 border-b border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-zinc-950/20">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-8">
                      <div className="flex items-center gap-4 w-full lg:w-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="lg:hidden h-10 w-10 rounded-xl bg-zinc-100 dark:bg-white/5 active:scale-95 transition-transform"
                          onClick={() => setSelectedMessage(null)}
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-2xl lg:text-3xl font-black tracking-tight max-w-2xl truncate">{selectedMessage.subject}</h2>
                      </div>
                      <div className="flex gap-2 ml-auto lg:ml-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-muted-foreground/60"
                          onClick={() => handleArchiveToggle(selectedMessage.id, activeTab !== 'archived')}
                        >
                          {activeTab === 'archived' ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 rounded-2xl bg-zinc-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/10 text-muted-foreground/60 hover:text-rose-600"
                          onClick={() => setItemToDelete(selectedMessage)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-black">
                          {selectedMessage.senderName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-lg">{selectedMessage.senderName}</span>
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                          <Clock className="h-3 w-3" />
                          {format(new Date(selectedMessage.createdAt), 'PPP p', { locale: fr })}
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-lg h-8 px-4 border-primary/20 text-primary font-black uppercase tracking-widest text-[9px]">
                        {activeTab === 'received' ? 'REÇU' : activeTab === 'sent' ? 'ENVOYÉ' : 'ARCHIVÉ'}
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-10">
                    <div className="max-w-3xl mx-auto">
                      <div className="text-lg font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                        {selectedMessage.content}
                      </div>

                      <div className="mt-16 pt-8 border-t border-dashed border-zinc-200 dark:border-white/10 flex flex-col items-center text-center opacity-30 select-none">
                        <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-full mb-4">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Message crypté de bout en bout</p>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-200 dark:border-white/5 flex gap-4">
                    <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/10">
                      Répondre <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] border-zinc-200 dark:border-white/10">
                      Transférer
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="relative">
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary/10 to-transparent blur-3xl rounded-full" />
                    <div className="h-32 w-32 rounded-[60px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-2xl flex items-center justify-center mb-10 relative z-10">
                      <div className="h-20 w-20 rounded-[40px] bg-primary/5 flex items-center justify-center animate-pulse">
                        <Inbox className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight mb-4 text-gradient">Sélectionnez un message</h3>
                  <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest max-w-xs mx-auto">
                    Aperçu complet du message et outils d'interaction
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <NewMessageModal open={isModalOpen} onOpenChange={setIsModalOpen} onMessageSent={handleMessageSent} />

      <AlertDialog open={!!itemToArchive} onOpenChange={() => setItemToArchive(null)}>
        <AlertDialogContent className="rounded-[32px] border-zinc-200 dark:border-white/10 shadow-2xl p-8 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Archiver le message ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/60 py-2">
              Cette action déplacera le message vers vos archives. Vous pourrez toujours le retrouver plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="rounded-2xl h-12 border-zinc-100 dark:border-white/10 font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl h-12 bg-primary hover:bg-primary/90 font-bold"
              onClick={() => {
                if (itemToArchive) handleArchiveToggle(itemToArchive.id, true);
                setItemToArchive(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[32px] border-zinc-200 dark:border-white/10 shadow-2xl p-8 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-rose-500">Supprimer le message ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/60 py-2">
              Attention, cette action est irréversible. Toutes les données liées à ce message seront effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="rounded-2xl h-12 border-zinc-100 dark:border-white/10 font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) handleDelete(itemToDelete.id);
                setItemToDelete(null);
              }}
              className="rounded-2xl h-12 bg-rose-500 hover:bg-rose-600 font-bold border-none"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
