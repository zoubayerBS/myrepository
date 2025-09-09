
'use client';

import { useAuth } from '@/lib/auth';
import { Message, Conversation } from '@/types';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';


const WEBSOCKET_URL = 'ws://localhost:8080';

interface ConversationClientPageProps {
  conversationId: string;
}

export default function ConversationClientPage({ conversationId }: ConversationClientPageProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user && conversationId) {
      setLoading(true);
      setError(null);
      Promise.all([
        fetch(`/api/conversations?userId=${user.uid}`)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch conversation details');
            return res.json();
          })
          .then((convos: Conversation[]) => {
            const currentConvo = convos.find(c => c.id === conversationId);
            setConversation(currentConvo || null);
          }),
        fetch(`/api/conversations/${conversationId}?userId=${user.uid}`)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch messages');
            return res.json();
          })
          .then(setMessages),
      ])
        .catch(err => {
          console.error("Failed to load conversation", err);
          setError("Failed to load conversation. Please try again.");
        })
        .finally(() => setLoading(false));
    }
  }, [user, conversationId]);

  useEffect(() => {
    if (user && conversationId) {
      const socket = new WebSocket(WEBSOCKET_URL);
      ws.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected for conversation', conversationId);
        socket.send(JSON.stringify({ type: 'register', payload: { userId: user.uid } }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.payload.conversationId === conversationId) {
            setMessages(prev => [...prev, data.payload]);
          }
        } catch (e) {
          console.error("Error processing incoming message in detail page", e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected for conversation', conversationId);
        ws.current = null;
      };

      socket.onerror = (error) => {
        console.error('WebSocket error in detail page:', error);
      };

      return () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.close();
        }
      };
    }
  }, [user, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !user || !conversationId || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const messagePayload = {
      conversationId,
      senderId: user.uid,
      content: newMessageContent.trim(),
    };

    ws.current.send(JSON.stringify({ type: 'private_message', payload: messagePayload }));

    const optimisticMessage: Message = {
      id: new Date().toISOString(),
      ...messagePayload,
      createdAt: new Date().toISOString(),
      senderName: user.username,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessageContent('');
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
    <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
            <div className="relative h-10 w-10 rounded-full flex items-center justify-center text-gray-800 text-xl font-semibold mr-4">
                {conversation?.otherParticipantName ? conversation.otherParticipantName[0].toUpperCase() : '?'}
            </div>
            <h2 className="text-xl font-semibold">{conversation?.otherParticipantName || 'Conversation'}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
            {messages.length === 0 && <p className="text-center text-gray-500">Aucun message pour le moment. Commencez la conversation !</p>}
            {messages.map((msg) => (
            <div
                key={msg.id}
                className={`flex items-start gap-4 ${msg.senderId === user?.uid ? 'flex-row-reverse' : ''}`}>
                <div className="relative h-10 w-10 rounded-full flex items-center justify-center text-gray-800 text-xl font-semibold">
                    {msg.senderName ? msg.senderName[0].toUpperCase() : '?'}
                </div>
                <div className={`flex flex-col gap-1 ${msg.senderId === user?.uid ? 'items-end' : ''}`}>
                    <div className={`p-4 rounded-2xl max-w-md lg:max-w-lg xl:max-w-2xl ${msg.senderId === user?.uid ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white rounded-bl-none shadow-md'}`}>
                        <p className="font-medium text-sm mb-1">{msg.senderName}</p>
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                    </div>
                    <p className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t bg-white flex items-center space-x-4">
            <Input
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            placeholder="Écrivez votre message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 p-4 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
            />
            <Button onClick={handleSendMessage} className="rounded-full p-4 w-14 h-14 flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors duration-200">
                <Send className="h-6 w-6 text-white" />
            </Button>
        </div>
    </div>
  );
}
