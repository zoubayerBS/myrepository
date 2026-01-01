import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, User, MessageSquare, MoreVertical, ArrowLeft, Loader2, Plus, Inbox, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Conversation, Message, AppUser } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Chat = () => {
  const { userData } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle responsiveness
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (mobile && activeConversation) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [activeConversation]);

  // Fetch conversations
  useEffect(() => {
    if (!userData?.uid) return;

    const fetchConversations = async () => {
      try {
        const response = await fetch(`/api/conversations?userId=${userData.uid}`);
        if (response.ok) {
          const data = await response.json();
          setConversations(data);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Poll for updates
    return () => clearInterval(interval);
  }, [userData?.uid]);

  // Fetch all users for search
  useEffect(() => {
    if (!isSearchModalOpen) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data.filter((u: AppUser) => u.uid !== userData?.uid));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, [isSearchModalOpen, userData?.uid]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${activeConversation.id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Faster polling for active chat
    return () => clearInterval(interval);
  }, [activeConversation]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c =>
      c.otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [conversations, searchQuery]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      u.prenom.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.nom.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.fonction.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [allUsers, userSearchQuery]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !userData) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userData.uid,
          receiverId: activeConversation.otherParticipantId,
          subject: activeConversation.subject || 'Direct Message',
          content: newMessage,
          conversationId: activeConversation.id // We'll need to ensure the API handles this
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Optimistically update local messages if polling is slow
        // However, the API might not return the formatted object immediately
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const backToSidebar = () => {
    setActiveConversation(null);
    setIsSidebarOpen(true);
  };

  const startConversation = async (participant2Id: string) => {
    if (!userData?.uid) return;

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant1Id: userData.uid,
          participant2Id: participant2Id
        }),
      });

      if (response.ok) {
        const newConv = await response.json();
        // Add to list if not already there
        if (!conversations.find(c => c.id === newConv.id)) {
          setConversations(prev => [newConv, ...prev]);
        }
        setActiveConversation(newConv);
        setIsSearchModalOpen(false);
        if (isMobileView) setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-180px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-180px)] w-full max-w-7xl mx-auto overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl shadow-2xl flex">
      {/* Background blobs for chat */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || !isMobileView) && (
          <motion.div
            initial={isMobileView ? { x: -300, opacity: 0 } : { opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
              "z-20 border-r border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl transition-all duration-300",
              isMobileView ? "absolute inset-0 w-full" : "w-[380px] flex-shrink-0"
            )}
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter text-gradient">Messages</h2>
                <Button
                  onClick={() => setIsSearchModalOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl bg-primary/5 hover:bg-primary/10 text-primary h-10 w-10"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-2">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                      <motion.button
                        key={conv.id}
                        layoutId={conv.id}
                        onClick={() => {
                          setActiveConversation(conv);
                          if (isMobileView) setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center gap-4 rounded-3xl transition-all duration-300 group relative overflow-hidden",
                          activeConversation?.id === conv.id
                            ? "bg-primary text-white shadow-xl shadow-primary/20"
                            : "hover:bg-white/60 dark:hover:bg-white/5"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14 border-2 border-transparent group-hover:border-primary/20 transition-all">
                            <AvatarFallback className={cn(
                              "font-black text-lg",
                              activeConversation?.id === conv.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                            )}>
                              {conv.otherParticipantName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500" />
                        </div>

                        <div className="flex-1 text-left overflow-hidden">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black tracking-tight truncate pr-2">
                              {conv.otherParticipantName}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tighter",
                              activeConversation?.id === conv.id ? "text-white/60" : "text-muted-foreground/40"
                            )}>
                              {conv.lastMessageTimestamp ? format(new Date(conv.lastMessageTimestamp), 'HH:mm') : ''}
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs truncate font-medium",
                            activeConversation?.id === conv.id ? "text-white/80" : "text-muted-foreground/60"
                          )}>
                            {conv.lastMessage || 'Nouvelle conversation'}
                          </p>
                        </div>

                        {/* Unread dot or something here if needed */}
                      </motion.button>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <div className="inline-flex p-4 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-dashed border-zinc-200 dark:border-zinc-800 mb-4">
                        <Inbox className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">Aucune discussion</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white/20 dark:bg-transparent relative z-10">
        <AnimatePresence mode="wait">
          {activeConversation ? (
            <motion.div
              key="active-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  {isMobileView && (
                    <Button variant="ghost" size="icon" onClick={backToSidebar} className="rounded-2xl -ml-2">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <Avatar className="h-12 w-12 border-2 border-primary/10">
                    <AvatarFallback className="bg-primary/5 text-primary font-black">
                      {activeConversation.otherParticipantName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black tracking-tight leading-none">{activeConversation.otherParticipantName}</h3>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">En ligne</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="rounded-2xl text-muted-foreground/40 hover:text-primary transition-colors">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Message List */}
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-6">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const isMe = msg.senderId === userData?.uid;
                      const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

                      return (
                        <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={cn("flex gap-3 max-w-[80%]", isMe && "flex-row-reverse")}>
                            {!isMe && (
                              <div className="w-8 flex-shrink-0">
                                {showAvatar && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                                      {activeConversation.otherParticipantName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col gap-1">
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={cn(
                                  "p-4 rounded-[24px] text-sm font-medium shadow-sm transition-all relative overflow-hidden",
                                  isMe
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-tr-none"
                                    : "bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-none"
                                )}
                              >
                                {msg.content}
                              </motion.div>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40 px-1",
                                isMe && "text-right"
                              )}>
                                {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
                      <div className="h-20 w-20 rounded-[40px] bg-primary/5 flex items-center justify-center mb-6 animate-bounce">
                        <MessageSquare className="h-10 w-10 text-primary" />
                      </div>
                      <h4 className="text-xl font-black tracking-tight mb-2">Commencez la discussion</h4>
                      <p className="text-sm font-medium text-muted-foreground/60 max-w-sm">
                        Envoyez un message à {activeConversation.otherParticipantName} pour débuter votre échange.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                  <div className="relative flex-1 group">
                    <Input
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="h-14 pl-6 pr-14 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-3xl focus:ring-primary/20 transition-all font-medium text-base shadow-inner"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {/* Optional emoji/attachment buttons here */}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="h-14 w-14 rounded-3xl p-0 flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 flex-shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Send className="h-6 w-6 -mr-1" />
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary/5 to-transparent blur-2xl rounded-full" />
                <div className="h-32 w-32 rounded-[60px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex items-center justify-center mb-10 relative z-10">
                  <div className="h-20 w-20 rounded-[40px] bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                </div>
              </motion.div>
              <h3 className="text-3xl font-black tracking-tighter mb-4 text-gradient">Votre messagerie</h3>
              <p className="text-base font-medium text-muted-foreground/60 max-w-md mx-auto mb-10">
                Sélectionnez un collègue dans la liste pour démarrer une conversation sécurisée.
              </p>
              {!isMobileView && (
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-zinc-100 dark:border-zinc-800">
                    <div className="text-primary font-black text-2xl mb-1">{conversations.length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Discussions</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-zinc-100 dark:border-zinc-800">
                    <div className="text-primary font-black text-2xl mb-1">{messages.filter(m => m.read === 0).length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Non lus</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* User Search Overlay */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black tracking-tight">Nouveau message</h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchModalOpen(false)} className="rounded-xl">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    placeholder="Rechercher un collègue..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-11 h-12 bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-2xl"
                    autoFocus
                  />
                </div>

                <ScrollArea className="h-72 -mx-2 px-2">
                  <div className="space-y-2">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.uid}
                          onClick={() => startConversation(user.uid)}
                          className="w-full p-3 flex items-center gap-4 rounded-2xl hover:bg-primary/5 transition-all group"
                        >
                          <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20 transition-all">
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                              {user.prenom[0]}{user.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <div className="font-bold text-sm">{user.prenom} {user.nom}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{user.fonction}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-12 text-center text-muted-foreground/40 font-bold uppercase tracking-widest text-xs">
                        {isLoading ? "Chargement..." : "Aucun utilisateur trouvé"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
