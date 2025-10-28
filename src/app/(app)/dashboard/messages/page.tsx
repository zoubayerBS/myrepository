'use client';

import { useAuth } from '@/lib/auth';
import { Message } from '@/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
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

  const isCurrent = swipedItemId === msg.id;
  const transform = isCurrent ? `translateX(${swipeProgress}px)` : 'translateX(0)';
  const transition = isCurrent && swipeProgress === 0 ? 'transform 0.3s ease-out' : 'none';

  return (
    <div key={msg.id} {...handlers} className="relative overflow-hidden rounded-lg">
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-200",
          isCurrent ? 'opacity-100' : 'opacity-0',
          swipeProgress > 0 ? 'bg-yellow-400' : 'bg-red-500'
        )}
      >
        {swipeProgress > 0 ? <Archive className="text-white" /> : <span></span>}
        {swipeProgress < 0 ? <Trash2 className="text-white" /> : <span></span>}
      </div>
      <div
        style={{ transform, transition }}
        onClick={() => onClick(msg)}
        className={cn(
          "relative z-10 flex items-start p-3 rounded-lg bg-white hover:bg-gray-100 cursor-pointer transition-colors duration-200",
          selectedMessage?.id === msg.id && 'bg-blue-100',
          !msg.read && activeTab === 'received' && 'font-bold'
        )}
      >
        <div className="flex-1">
          <div className="flex justify-between items-baseline">
            <h3 className="text-md">{msg.senderName}</h3>
            <p
              className={cn(
                "text-xs",
                !msg.read && activeTab === 'received' ? 'text-blue-500' : 'text-gray-400'
              )}
            >
              {format(new Date(msg.createdAt), 'p', { locale: fr })}
            </p>
          </div>
          <p className="text-sm text-gray-800 truncate">{msg.subject}</p>
          <p className="text-xs text-gray-500 truncate">{msg.content}</p>
        </div>
      </div>
    </div>
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Boîte de réception</h1>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <FilePlus className="mr-2 h-4 w-4" />
            Nouveau
          </Button>
        </div>

        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="received">Reçus</TabsTrigger>
          <TabsTrigger value="sent">Envoyés</TabsTrigger>
          <TabsTrigger value="archived">Archivés</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-1">
          {/* Liste des messages */}
          <div className="md:col-span-1 lg:col-span-1 bg-white rounded-xl shadow-lg p-4 flex flex-col">
            <TabsContent value="received" className="flex-1 flex flex-col data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Aucun message reçu.</div>
                ) : (
                  messages.map((msg) => (
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
                )}
              </div>
            </TabsContent>

            {/* Envoyés */}
            <TabsContent value="sent" className="flex-1 flex flex-col data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Aucun message envoyé.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleMessageClick(msg)}
                      className={`flex items-start p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                        selectedMessage?.id === msg.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-md">À: {msg.receiverName}</h3>
                          <p className="text-xs text-gray-400">
                            {format(new Date(msg.createdAt), 'p', { locale: fr })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-800 truncate">{msg.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Archivés */}
            <TabsContent value="archived" className="flex-1 flex flex-col data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Aucun message archivé.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleMessageClick(msg)}
                      className={`flex items-start p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                        selectedMessage?.id === msg.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-md">De: {msg.senderName}</h3>
                          <p className="text-xs text-gray-400">
                            {format(new Date(msg.createdAt), 'p', { locale: fr })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-800 truncate">{msg.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </div>

          {/* Affichage du message */}
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-lg flex flex-col">
            {selectedMessage ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">{selectedMessage.subject}</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {activeTab === 'archived' ? (
                          <ArchiveRestore className="h-5 w-5" />
                        ) : (
                          <Archive className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {activeTab === 'archived' ? (
                        <DropdownMenuItem
                          onClick={() => handleArchiveToggle(selectedMessage.id, false)}
                        >
                          Désarchiver
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleArchiveToggle(selectedMessage.id, true)}
                        >
                          Archiver
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 mt-2 p-4">
                  <div className="relative h-10 w-10 rounded-full flex items-center justify-center text-gray-800 text-xl font-semibold">
                    {selectedMessage.senderName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedMessage.senderName}</p>
                    <p className="text-sm text-gray-500">À: moi</p>
                  </div>
                  <p className="text-sm text-gray-500 ml-auto">
                    {format(new Date(selectedMessage.createdAt), 'PPP p', { locale: fr })}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 whitespace-pre-wrap">
                  {selectedMessage.content}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-2xl font-semibold">Sélectionnez un message</p>
                  <p className="text-md">pour le lire.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Tabs>

      <NewMessageModal open={isModalOpen} onOpenChange={setIsModalOpen} onMessageSent={handleMessageSent} />

      <AlertDialog open={!!itemToArchive} onOpenChange={() => setItemToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver le message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action déplacera le message vers les archives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToArchive) handleArchiveToggle(itemToArchive.id, true);
                setItemToArchive(null);
              }}
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera définitivement le message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) handleDelete(itemToDelete.id);
                setItemToDelete(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
