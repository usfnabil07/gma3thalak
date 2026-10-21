'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import { STORAGE_KEYS } from '@/constants/config';

const HISTORY_EXPIRATION_MS = 60 * 60 * 1000;

interface ChatContextType {
  messages: any[];
  input: string;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
  stop: () => Promise<void>;
  isLoading: boolean;
  append: (msg: any) => void;
  error: any;
  setMessages: (msgs: any[]) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [chatOwnerId, setChatOwnerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const lastHistoryPersistAtRef = useRef(0);
  const chat = useChat();
  const [input, setInput] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
    });
  }, []);

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  const sendChatMessage = async (text: string) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token || token;
    const options = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined;

    await chat.sendMessage({ text }, options);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!input.trim()) return;
    void sendChatMessage(input);
    setInput('');
  };

  const append = (msg: any) => {
    void sendChatMessage(msg.content);
  };

  const isLoading = chat.status === 'streaming' || chat.status === 'submitted';

  useEffect(() => {
    if (loading) return;

    const userId = profile?.user_id || 'guest';
    const storageKey = `${STORAGE_KEYS.CHAT_HISTORY_PREFIX}${userId}`;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { timestamp, messages } = JSON.parse(stored);
        if (Date.now() - timestamp < HISTORY_EXPIRATION_MS) {
          chat.setMessages(messages);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Failed to restore chat history:', error);
      chat.setMessages([]);
    }

    setInitialLoaded(true);
    setChatOwnerId(userId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile?.user_id]);

  useEffect(() => {
    if (!initialLoaded) return;

    const userId = profile?.user_id || 'guest';
    if (chatOwnerId !== userId) return;

    const storageKey = `${STORAGE_KEYS.CHAT_HISTORY_PREFIX}${userId}`;
    const isGenerating = chat.status === 'streaming' || chat.status === 'submitted';
    const now = Date.now();
    const delay = isGenerating
      ? Math.max(0, 1000 - (now - lastHistoryPersistAtRef.current))
      : 0;
    const timer = window.setTimeout(() => {
      try {
        if (chat.messages.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify({
            timestamp: Date.now(),
            messages: chat.messages,
          }));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // Keep the chat responsive if browser storage is unavailable or full.
      }
      lastHistoryPersistAtRef.current = Date.now();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [chat.messages, chat.status, initialLoaded, profile?.user_id, chatOwnerId]);

  const transformedMessages = chat.messages.map(msg => {
    if (!('content' in msg) && (msg as any).parts) {
      const content = (msg as any).parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
      return { ...msg, content };
    }
    return msg;
  });

  const contextValue: ChatContextType = {
    messages: transformedMessages,
    input,
    handleInputChange,
    handleSubmit,
    stop: () => chat.stop(),
    isLoading,
    append,
    error: chat.error,
    setMessages: chat.setMessages,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
