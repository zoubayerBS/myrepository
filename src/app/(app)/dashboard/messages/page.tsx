'use client';

import { useAuth } from '@/lib/auth';
import { Message } from '@/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus, Archive, ArchiveRestore } from 'lucide-react';

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

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('received'); // 'received', 'sent', 'archived'

  const fetchMessages = (type: string) => {
    if (user) {
      setLoading(true);
      setError(null);
      let apiUrl = `/api/messages?userId=${user.uid}&type=${type}`;

      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch messages');
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setMessages(data);
          } else {
            console.error('API returned non-array data:', data);
            setMessages([]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch messages', err);
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
      if (!response.ok) {
        throw new Error('Failed to update archive status');
      }
      fetchMessages(activeTab);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error archiving/unarchiving message:', error);
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
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="h-full flex flex-col"
      >
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
          {/* Sidebar messages list */}
          <div className="md:col-span-1 lg:col-span-1 bg-white rounded-xl shadow-lg p-4 flex flex-col">
            {/* Reçus */}
            <TabsContent
              value="received"
              className="flex-1 flex flex-col data-[state=inactive]:hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Aucun message reçu.
                  </div>
                )}
                {messages.map((msg) => {
                  if (!msg) return null;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleMessageClick(msg)}
                      className={`flex items-start p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                        selectedMessage?.id === msg.id ? 'bg-blue-100' : ''
                      } ${!msg.read && activeTab === 'received' ? 'font-bold' : ''}`}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-md">{msg.senderName}</h3>
                          <p
                            className={`text-xs ${
                              !msg.read && activeTab === 'received'
                                ? 'text-blue-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {format(new Date(msg.createdAt), 'p', { locale: fr })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-800 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Envoyés */}
            <TabsContent
              value="sent"
              className="flex-1 flex flex-col data-[state=inactive]:hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Aucun message envoyé.
                  </div>
                )}
                {messages.map((msg) => {
                  if (!msg) return null;
                  return (
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
                        <p className="text-sm text-gray-800 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Archivés */}
            <TabsContent
              value="archived"
              className="flex-1 flex flex-col data-[state=inactive]:hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {messages.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Aucun message archivé.
                  </div>
                )}
                {messages.map((msg) => {
                  if (!msg) return null;
                  return (
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
                        <p className="text-sm text-gray-800 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </div>

          {/* Message viewer */}
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-lg flex flex-col">
            {selectedMessage ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">
                    {selectedMessage.subject}
                  </h2>
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
                          onClick={() =>
                            handleArchiveToggle(selectedMessage.id, false)
                          }
                        >
                          Désarchiver
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            handleArchiveToggle(selectedMessage.id, true)
                          }
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
                    {format(new Date(selectedMessage.createdAt), 'PPP p', {
                      locale: fr,
                    })}
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

      <NewMessageModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}