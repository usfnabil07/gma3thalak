'use client';

import React, { useState, useRef, useEffect, useCallback, useContext, memo } from 'react';
import { createPortal } from 'react-dom';
import { useChatContext } from './ChatContext';
import { Lock, ArrowUpLeft, Heart, Copy, Check, Eye, X, Maximize2, Minimize2, Square } from 'lucide-react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import styles from './ChatWidget.module.css';
import SupportAvatar from '@/components/support/SupportAvatar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import SupportTickets from '@/components/support/SupportTickets';
import { supabase } from '@/services/supabase/client';
import { SUPPORT_TICKET_READ_EVENT } from '@/components/support/supportReadState';

// Shared code renderer used for assistant messages.
const ChatMessageStreamingContext = React.createContext(false);

const CodeRenderer = ({ className, children, ...props }: any) => {
  const isMessageStreaming = useContext(ChatMessageStreamingContext);
  const isBlock = className?.startsWith('language-');
  const lang = (className || '').replace('language-', '') || 'text';
  const [copied, setCopied] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen]);

  if (isBlock) {
    const code = String(children).replace(/\n$/, '');
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {}
    };
    const renderCode = (codeClassName: string, customStyle: React.CSSProperties) => isMessageStreaming
      ? <pre className={codeClassName} style={{ ...customStyle, color: '#abb2bf', padding: '16px', fontFamily: "'Fira Code', Consolas, monospace", lineHeight: 1.6 }}><code>{code}</code></pre>
      : <SyntaxHighlighter
          className={codeClassName}
          language={lang}
          style={atomOneDark}
          customStyle={customStyle}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>;
    return (
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          <span className={styles.codeLang}>{lang}</span>
          <div className={styles.codeHeaderActions}>
            <div className={styles.codeDots}><span /><span /><span /></div>
            <button className={styles.codeActionButton} type="button" onClick={() => setViewerOpen(true)} aria-label="\u0639\u0631\u0636 \u0627\u0644\u0643\u0648\u062f" title="\u0639\u0631\u0636 \u0627\u0644\u0643\u0648\u062f">
              <Eye size={15} aria-hidden="true" />
              <span>{'\u0639\u0631\u0636'}</span>
            </button>
            <button className={`${styles.codeActionButton} ${styles.codeCopyButton}`} type="button" onClick={handleCopy} aria-label={copied ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : '\u0646\u0633\u062e \u0627\u0644\u0643\u0648\u062f'} title={copied ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : '\u0646\u0633\u062e \u0627\u0644\u0643\u0648\u062f'}>
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {renderCode(styles.codeContent, {
            margin: 0, 
            borderRadius: 0, 
            fontSize: '0.9rem', 
            background: '#1e1e1e', 
            direction: 'ltr', 
            textAlign: 'left',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'auto',
            whiteSpace: 'pre',
          })}
        {viewerOpen && createPortal(
          <div className={styles.codeViewerOverlay} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
            <section className={styles.codeViewer} role="dialog" aria-modal="true" aria-label="\u0639\u0631\u0636 \u0627\u0644\u0643\u0648\u062f" dir="rtl">
              <header className={styles.codeViewerHeader}>
                <div className={styles.codeViewerTitle}><Eye size={17} aria-hidden="true" /><span>{'\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0643\u0648\u062f'}</span><small>{lang}</small></div>
                <div className={styles.codeViewerActions}>
                  <button className={styles.codeViewerCopy} type="button" onClick={handleCopy}>
                    {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    <span>{copied ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : '\u0646\u0633\u062e \u0627\u0644\u0643\u0648\u062f'}</span>
                  </button>
                  <button className={styles.codeViewerClose} type="button" onClick={() => setViewerOpen(false)} aria-label="\u0625\u063a\u0644\u0627\u0642"><X size={18} aria-hidden="true" /></button>
                </div>
              </header>
              {renderCode(styles.codeViewerContent, { margin: 0, padding: '22px', background: '#111722', direction: 'ltr', textAlign: 'left', width: '100%', height: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'auto', whiteSpace: 'pre' })}
            </section>
          </div>,
          document.body,
        )}
      </div>
    );
  }
  return <code className={styles.inlineCode} {...props}>{children}</code>;
};

const markdownComponents = { code: CodeRenderer };

let supportUnreadChannelSequence = 0;

const playTeaserNotes = (context: AudioContext) => {
  const start = context.currentTime;
  [
    { frequency: 740, offset: 0 },
    { frequency: 988, offset: 0.11 },
  ].forEach(({ frequency, offset }) => {
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const noteStart = start + offset;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    volume.gain.setValueAtTime(0.0001, noteStart);
    volume.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.25);
  });
};

const copy = {
  open: '\u0641\u062a\u062d \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a',
  close: '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a',
  expand: '\u062a\u0643\u0628\u064a\u0631 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u062f\u0631\u062f\u0634\u0629',
  restore: '\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u062d\u062c\u0645 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u062f\u0631\u062f\u0634\u0629',
  site: '\u0645\u0633\u0627\u0639\u062f\u0629 \u0641\u064a \u0645\u0646\u0635\u0629 \u062c\u0645\u0639\u062a\u0647\u0627\u0644\u0643',
  titleA: '\u0643\u064a\u0641 ', titleB: '\u0646\u0633\u0627\u0639\u062f\u0643', titleC: ' \u0627\u0644\u064a\u0648\u0645\u061f',
  subtitle: '\u0645\u0633\u0627\u0639\u062f\u0643 \u0627\u0644\u062f\u0631\u0627\u0633\u064a \u0648\u0641\u0631\u064a\u0642 \u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u064a \u0647\u0646\u0627 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643.',
  name: 'جُمعة (AI)', status: '\u062c\u0627\u0647\u0632 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643', guestStatus: '\u064a\u062a\u0637\u0644\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', guestPreview: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0628\u062f\u0621 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629', preview: '\u0627\u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0623\u0648 \u0627\u0644\u0644\u0648\u0627\u0626\u062d \u0623\u0648 \u0634\u0631\u062d \u0627\u0644\u0645\u0648\u0627\u062f',
  footer: '\u0646\u062d\u0646 \u0647\u0646\u0627 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643',
  teaserTitle: 'أهلًا، أنا جُمعة', teaserText: 'إزاي أقدر أساعدك النهاردة؟', dismiss: '\u0625\u062e\u0641\u0627\u0621',
  supportName: '\u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u064a', supportPreview: '\u0627\u0641\u062a\u062d \u062a\u0630\u0643\u0631\u0629 \u0648\u062a\u0627\u0628\u0639 \u0631\u062f \u0641\u0631\u064a\u0642\u0646\u0627 \u0645\u0646 \u0647\u0646\u0627',
  supportTeaserTitle: '\u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u064a', supportTeaserText: '\u0641\u0631\u064a\u0642\u0646\u0627 \u062c\u0627\u0647\u0632 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u062f\u0627\u064a\u0645\u064b\u0627',
  authTitle: '\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643', authText: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0628\u062f\u0621 \u0645\u062d\u0627\u062f\u062b\u062a\u0643 \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629.',
  login: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', register: '\u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f',
  newChat: '\u0645\u062d\u0627\u062f\u062b\u0629 \u062c\u062f\u064a\u062f\u0629', writing: '\u064a\u0643\u062a\u0628 \u0627\u0644\u0622\u0646', preparing: '\u064a\u062c\u0647\u0632 \u0625\u062c\u0627\u0628\u062a\u0643',
  error: '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0628\u0639\u062f \u0642\u0644\u064a\u0644.',
  limit: '\u0648\u0635\u0644\u062a \u0625\u0644\u0649 \u0627\u0644\u062d\u062f \u0627\u0644\u064a\u0648\u0645\u064a \u0644\u0644\u0631\u0633\u0627\u0626\u0644. \u062d\u0627\u0648\u0644 \u0645\u062c\u062f\u062f\u064b\u0627 \u0628\u0639\u062f 24 \u0633\u0627\u0639\u0629.',
  input: '\u0627\u0643\u062a\u0628 \u0631\u0633\u0627\u0644\u062a\u0643', messageText: '\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629', send: '\u0625\u0631\u0633\u0627\u0644', stop: '\u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0631\u062f', back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a',
};
const MemoizedChatMessage = memo(({ msg, isStreaming = false, stopTyping = false, onTypingStateChange }: {
  msg: any;
  isStreaming?: boolean;
  stopTyping?: boolean;
  onTypingStateChange?: (messageId: string, active: boolean) => void;
}) => {
  const content = String(msg.content || '');
  const charactersRef = useRef<string[]>([]);
  charactersRef.current = Array.from(content);
  const visibleLengthRef = useRef(isStreaming ? 0 : charactersRef.current.length);
  const [visibleContent, setVisibleContent] = useState(() => isStreaming ? '' : content);
  const isTypingAnimationActive = !stopTyping && (isStreaming || visibleLengthRef.current < charactersRef.current.length);
  const hasStreamedRef = useRef(isStreaming);
  if (isStreaming) hasStreamedRef.current = true;

  useEffect(() => {
    if (isStreaming || hasStreamedRef.current) return;
    visibleLengthRef.current = charactersRef.current.length;
    setVisibleContent(content);
  }, [content, isStreaming]);

  useEffect(() => {
    if (msg.role === 'assistant') onTypingStateChange?.(msg.id, isTypingAnimationActive);
  }, [msg.id, msg.role, isTypingAnimationActive, onTypingStateChange]);

  useEffect(() => {
    if (stopTyping && !visibleContent && content) {
      visibleLengthRef.current = charactersRef.current.length;
      setVisibleContent(content);
    }
  }, [stopTyping, visibleContent, content]);

  useEffect(() => {
    if (stopTyping) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      visibleLengthRef.current = charactersRef.current.length;
      setVisibleContent(charactersRef.current.join(''));
      return;
    }
    if (!isStreaming && visibleLengthRef.current >= charactersRef.current.length) return;

    const timer = window.setInterval(() => {
      const characters = charactersRef.current;
      const remaining = characters.length - visibleLengthRef.current;
      if (remaining <= 0) {
        if (!isStreaming) window.clearInterval(timer);
        return;
      }

      const step = remaining > 240 ? 8 : remaining > 80 ? 4 : 2;
      visibleLengthRef.current = Math.min(characters.length, visibleLengthRef.current + step);
      setVisibleContent(characters.slice(0, visibleLengthRef.current).join(''));
    }, 40);

    return () => window.clearInterval(timer);
  }, [isStreaming, msg.id, stopTyping]);

  return (
    <div className={`${styles.messageBubble} ${msg.role === 'assistant' ? styles.bubbleBot : styles.bubbleUser}`}>
      {msg.role === 'assistant' ? isTypingAnimationActive && !visibleContent ? <div className={styles.typingIndicator} aria-label={copy.writing}><span /><span /><span /></div> : <div className={styles.markdownContent}><ChatMessageStreamingContext.Provider value={isTypingAnimationActive}><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{visibleContent}</ReactMarkdown></ChatMessageStreamingContext.Provider></div> : content}
    </div>
  );
});
export default function ChatWidget() {
  const { profile, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [teaserMode, setTeaserMode] = useState<'ai' | 'support'>('ai');
  const [badgeCount, setBadgeCount] = useState(0);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [teaserTitle, setTeaserTitle] = useState(copy.teaserTitle);
  const [teaserText, setTeaserText] = useState(copy.teaserText);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [stoppedTypingMessageId, setStoppedTypingMessageId] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, stop, isLoading, error } = useChatContext();
  const handleTypingStateChange = useCallback((messageId: string, active: boolean) => {
    setTypingMessageId(current => active ? messageId : current === messageId ? null : current);
  }, []);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const handleChatBodyScroll = useCallback(() => {
    const body = chatBodyRef.current;
    if (!body) return;
    shouldAutoScrollRef.current = body.scrollHeight - body.scrollTop - body.clientHeight < 72;
  }, []);
  const pauseAutoScrollOnUpwardIntent = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0) shouldAutoScrollRef.current = false;
  }, []);
  const pauseAutoScrollOnTouch = useCallback(() => {
    shouldAutoScrollRef.current = false;
  }, []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedTeaserSoundRef = useRef(false);
  const teaserSoundEligibleRef = useRef(false);
  const hasReachedLimit = messages.filter((m: any) => m.role === 'user').length >= 7 && profile?.role !== 'superadmin';
  const lastMessage = messages[messages.length - 1] as any;
  const isTypingReply = lastMessage?.role === 'assistant'
    && typingMessageId === lastMessage.id
    && stoppedTypingMessageId !== lastMessage.id;
  const isReplyBusy = isLoading || isTypingReply;
  const handleStopReply = () => {
    if (isLoading) void stop();
    if (isTypingReply && lastMessage?.role === 'assistant') setStoppedTypingMessageId(lastMessage.id);
  };
  const showTypingIndicator = isLoading && !error && (lastMessage?.role === 'user' || (lastMessage?.role === 'assistant' && !lastMessage.content?.trim()));

  useEffect(() => {
    if (isOpen && showThread) shouldAutoScrollRef.current = true;
  }, [isOpen, showThread]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current || !chatBodyRef.current) return;
    const timer = window.setTimeout(() => {
      if (shouldAutoScrollRef.current && chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [messages, isLoading, isOpen, showThread, showSupport]);

  const handleChatSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    shouldAutoScrollRef.current = true;
    handleSubmit(event);
  };

  useEffect(() => {
    if (authLoading) return;
    const userId = profile?.user_id;
    if (!userId) {
      setBadgeCount(0);
      return;
    }

    let active = true;
    const refreshUnreadSupportMessages = async () => {
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets').select('id').eq('user_id', userId).limit(500);
      if (!active) return;
      if (ticketsError || !tickets?.length) {
        setBadgeCount(0);
        return;
      }

      const ticketIds = tickets.map((ticket) => ticket.id);
      const [readsResult, messagesResult] = await Promise.all([
        supabase.from('support_ticket_reads').select('ticket_id, last_read_at')
          .eq('user_id', userId).in('ticket_id', ticketIds),
        supabase.from('support_ticket_messages').select('ticket_id, sender_id, created_at')
          .in('ticket_id', ticketIds).neq('sender_id', userId)
          .order('created_at', { ascending: false }).limit(1000),
      ]);
      if (!active) return;
      if (readsResult.error || messagesResult.error) {
        setBadgeCount(0);
        return;
      }

      const lastReadByTicket = new Map(
        (readsResult.data ?? []).map((read) => [read.ticket_id, read.last_read_at]),
      );
      const unreadCount = (messagesResult.data ?? []).filter((message) => {
        const lastReadAt = lastReadByTicket.get(message.ticket_id);
        return !lastReadAt || message.created_at > lastReadAt;
      }).length;
      setBadgeCount(unreadCount);
    };

    let realtimeReady = false;
    const channelTopic = `support-unread-${userId}-${Date.now()}-${++supportUnreadChannelSequence}`;
    const channel = supabase.channel(channelTopic)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_messages',
      }, (payload) => {
        const incoming = payload.new as { sender_id?: string };
        if (incoming.sender_id !== userId) void refreshUnreadSupportMessages();
      })
      .subscribe((status) => { realtimeReady = status === 'SUBSCRIBED'; });

    const handleTicketRead = () => { void refreshUnreadSupportMessages(); };
    window.addEventListener(SUPPORT_TICKET_READ_EVENT, handleTicketRead);
    void refreshUnreadSupportMessages();
    const fallbackTimer = window.setInterval(() => {
      if (!realtimeReady) void refreshUnreadSupportMessages();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(fallbackTimer);
      window.removeEventListener(SUPPORT_TICKET_READ_EVENT, handleTicketRead);
      void supabase.removeChannel(channel);
    };
  }, [authLoading, profile?.user_id]);

  const ensureAudioContext = useCallback(() => {
    const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext || browserWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextConstructor();
    }
    return audioContextRef.current;
  }, []);

  const playTeaserSound = useCallback((fromAssistantClick = false) => {
    const context = ensureAudioContext();
    if (!context) return false;
    if (context.state === 'running') {
      teaserSoundEligibleRef.current = false;
      playTeaserNotes(context);
      return true;
    }
    // Only retry after an intentional assistant interaction, never an unrelated page click.
    if (fromAssistantClick && context.state === 'suspended' && teaserSoundEligibleRef.current) {
      void context.resume().then(() => {
        if (teaserSoundEligibleRef.current && context.state === 'running') {
          teaserSoundEligibleRef.current = false;
          playTeaserNotes(context);
        }
      }).catch(() => {});
    }
    return false;
  }, [ensureAudioContext]);

  useEffect(() => {
    const unlockAudio = () => {
      const context = ensureAudioContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume().catch(() => {});
    };
    // Try autoplay where permitted; later retries are limited to deliberate assistant controls.
    unlockAudio();
    document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
    document.addEventListener('keydown', unlockAudio, { once: true, capture: true });
    return () => {
      document.removeEventListener('pointerdown', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close().catch(() => {});
    };
  }, [ensureAudioContext]);

  useEffect(() => {
    if (teaserVisible && !hasPlayedTeaserSoundRef.current) {
      hasPlayedTeaserSoundRef.current = true;
      try {
        if (sessionStorage.getItem('sc-teaser-sound-played') === '1') return;
        sessionStorage.setItem('sc-teaser-sound-played', '1');
      } catch {}
      if (!playTeaserSound()) teaserSoundEligibleRef.current = true;
    }
  }, [teaserVisible, playTeaserSound]);

  const playTeaserSoundFromAssistantClick = () => {
    if (teaserSoundEligibleRef.current) playTeaserSound(true);
  };

  const dismissTeaser = useCallback(() => { setTeaserVisible(false); }, []);
  const openPanel = useCallback(() => { dismissTeaser(); setIsOpen(true); }, [dismissTeaser]);
  const closePanel = useCallback(() => { setIsOpen(false); setIsExpanded(false); }, []);
  const openSupport = useCallback(() => { setShowThread(false); setShowSupport(true); setIsExpanded(false); openPanel(); }, [openPanel]);

  useEffect(() => {
    if (isOpen) return;
    const timer = window.setTimeout(() => setTeaserVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!teaserVisible || isOpen) return;
    const timer = window.setInterval(() => {
      setTeaserMode((current) => current === 'ai' ? 'support' : 'ai');
    }, 7000);
    return () => window.clearInterval(timer);
  }, [teaserVisible, isOpen]);

  useEffect(() => {
    setTeaserTitle(teaserMode === 'ai' ? copy.teaserTitle : copy.supportTeaserTitle);
    setTeaserText(teaserMode === 'ai' ? copy.teaserText : copy.supportTeaserText);
  }, [teaserMode]);

  useEffect(() => {
    const api = {
      open: openPanel,
      close: closePanel,
      setBadge: (count: number) => setBadgeCount(Math.max(0, Math.floor(Number(count) || 0))),
      showTeaser: (title?: string, text?: string) => { setTeaserMode('ai'); setTeaserTitle(title || copy.teaserTitle); setTeaserText(text || copy.teaserText); setTeaserVisible(true); },
      hideTeaser: () => dismissTeaser(),
    };
    (window as any).scChat = api;
    return () => { if ((window as any).scChat === api) delete (window as any).scChat; };
  }, [openPanel, closePanel, dismissTeaser]);

  const latestPreview = [...messages].reverse().find((message: any) => message.content)?.content;

  return (
    <div className={styles.widgetContainer}>
      <AnimatePresence>
        {isOpen && <motion.div id="assistant-chat-panel" className={`${styles.chatWindow} ${isExpanded ? styles.chatWindowExpanded : ''}`} layout
          initial={{ opacity: 0, x: -10, scaleX: 0.985, scaleY: 0.99 }}
          animate={{ opacity: 1, x: 0, scaleX: 1, scaleY: 1 }}
          exit={{ opacity: 0, x: -7, scaleX: 0.99, scaleY: 0.995, transition: { duration: 0.28, ease: 'easeInOut' } }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}>
          {!showThread && !showSupport ? <div className={styles.homeView}>
            <div className={styles.browserBar}>
              <span className={styles.browserDots} aria-hidden="true"><i /><i /><i /></span>
              <span className={styles.browserUrl}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><span className={styles.browserUrlText}>{copy.site}</span></span>
              <button className={styles.browserClose} type="button" aria-label={copy.close} onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
            </div>
            <div className={styles.homeIntro}><h2>{copy.titleA}<span className={styles.homeHighlight}>{copy.titleB}</span>{copy.titleC}</h2><p>{copy.subtitle}</p></div>
            <div className={styles.conversationList}>
              <button type="button" className={styles.conversationCard} onClick={() => setShowThread(true)}>
                <span className={`${styles.conversationIcon} ${styles.aiConversationIcon}`} aria-hidden="true"><Image src="/images/ai/ai-avatar-profile.svg" alt="" width={48} height={48} /></span>
                <span className={styles.conversationBody}><span className={styles.conversationName}>{copy.name}</span><span className={styles.conversationStatus}><i />{isReplyBusy ? copy.writing : (!profile && !authLoading ? copy.guestStatus : copy.status)}</span><span className={styles.conversationPreview}>{!profile && !authLoading ? copy.guestPreview : (latestPreview || copy.preview)}</span></span>
              </button>
              {profile?.role === 'support' ? <div className={styles.supportStaffNotice} role="note">
                <SupportAvatar size={46} />
                <span><b>حساب فريق الدعم الفني</b><small>إدارة التذاكر متاحة من لوحة الدعم.</small></span>
              </div> : <button type="button" className={styles.supportCta} onClick={openSupport}>
                <SupportAvatar size={46} />
                <span className={styles.supportContent}><b>{copy.supportName}</b><span>{copy.supportPreview}</span></span>
                <span className={styles.supportArrow} aria-hidden="true"><ArrowUpLeft size={19} strokeWidth={2.5} /></span>
              </button>}
            </div>
            <div className={styles.homeFooter}><span>{copy.footer}</span><Heart className={styles.homeFooterHeart} size={14} fill="currentColor" aria-hidden="true" /></div>
          </div> : showSupport ? <div className={styles.threadView}>
            <div className={styles.threadHeader}>
              <button className={styles.backBtn} type="button" aria-label={copy.back} onClick={() => { setShowSupport(false); setIsExpanded(false); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
              <div className={`${styles.threadIdentity} ${styles.supportThreadIdentity}`}><SupportAvatar size={40} /><span><b>{profile?.role === 'support' ? 'حساب الدعم الفني' : copy.supportName}</b><small>{profile?.role === 'support' ? 'لوحة إدارة التذاكر' : copy.supportPreview}</small></span></div>
              <button className={`${styles.browserClose} ${styles.expandButton}`} type="button" aria-label={isExpanded ? copy.restore : copy.expand} title={isExpanded ? copy.restore : copy.expand} aria-pressed={isExpanded} onClick={() => setIsExpanded(value => !value)}>{isExpanded ? <Minimize2 size={20} aria-hidden="true" /> : <Maximize2 size={20} aria-hidden="true" />}</button>
              <button className={styles.browserClose} type="button" aria-label={copy.close} onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
            </div>
            {!profile && !authLoading ? <div className={styles.authRequired}><div className={styles.authHero}><h3 className={styles.welcomeTitle}>{copy.authTitle}</h3><p className={styles.welcomeText}>{copy.authText}</p><div className={styles.authButtons}><Link href="/auth/login" className="btn btn-primary" onClick={closePanel}>{copy.login}</Link><Link href="/auth/register" className="btn btn-outline" onClick={closePanel}>{copy.register}</Link></div></div></div> : profile?.role === 'support' ? <div className={`${styles.supportEmbed} ${styles.supportStaffNoticePanel}`}><SupportAvatar size={58} /><b>أنت مسجل كعضو في فريق الدعم الفني</b><span>استخدم لوحة الدعم لمتابعة تذاكر المستخدمين والرد عليها.</span></div> : <div className={styles.supportEmbed}><SupportTickets embedded /></div>}
          </div> : <div className={styles.threadView}>
            <div className={styles.threadHeader}>
              <button className={styles.backBtn} type="button" aria-label={copy.back} onClick={() => { setShowThread(false); setShowSupport(false); setIsExpanded(false); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
              <div className={styles.threadIdentity}><b>{copy.name}</b><small><span className={styles.onlineDot} />{isReplyBusy ? copy.preparing : copy.status}</small></div>
              <button className={`${styles.browserClose} ${styles.expandButton}`} type="button" aria-label={isExpanded ? copy.restore : copy.expand} title={isExpanded ? copy.restore : copy.expand} aria-pressed={isExpanded} onClick={() => setIsExpanded(value => !value)}>{isExpanded ? <Minimize2 size={20} aria-hidden="true" /> : <Maximize2 size={20} aria-hidden="true" />}</button>
              <button className={styles.browserClose} type="button" aria-label={copy.close} onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
            </div>
            {!profile && !authLoading ? <div className={styles.authRequired}><div className={styles.authHero}><h3 className={styles.welcomeTitle}>{copy.authTitle}</h3><p className={styles.welcomeText}>{copy.authText}</p><div className={styles.authButtons}><Link href="/auth/login" className="btn btn-primary" onClick={closePanel}>{copy.login}</Link><Link href="/auth/register" className="btn btn-outline" onClick={closePanel}>{copy.register}</Link></div></div></div> : <>
              <div className={styles.chatBody} ref={chatBodyRef} onScroll={handleChatBodyScroll} onWheelCapture={pauseAutoScrollOnUpwardIntent} onTouchMoveCapture={pauseAutoScrollOnTouch} aria-live="polite">
                {messages.length === 0 && <div className={styles.dayDivider}>{copy.newChat}</div>}
                {messages.map((msg: any, index: number) => {
                  if (isLoading && msg.role === 'assistant' && !msg.content?.trim()) return null;
                  const isStreamingMessage = isLoading && index === messages.length - 1 && msg.role === 'assistant';
                  const isLatestAssistant = index === messages.length - 1 && msg.role === 'assistant';
                  return <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'assistant' ? styles.messageRowBot : styles.messageRowUser}`}><MemoizedChatMessage msg={msg} isStreaming={isStreamingMessage} stopTyping={stoppedTypingMessageId === msg.id} onTypingStateChange={isLatestAssistant ? handleTypingStateChange : undefined} /></div>;
                })}
                {showTypingIndicator && <div className={`${styles.messageRow} ${styles.messageRowBot}`}><div className={`${styles.messageBubble} ${styles.bubbleBot} ${styles.typingIndicator}`} aria-label={copy.writing}><span /><span /><span /></div></div>}
                {error && <div className={`${styles.messageRow} ${styles.messageRowBot}`}><div className={`${styles.messageBubble} ${styles.bubbleBot} ${styles.errorBubble}`}>{copy.error}</div></div>}
              </div>
              <div className={styles.chatFooter}>{hasReachedLimit && !isReplyBusy ? <div className={styles.limitNotice}><Lock size={16} />{copy.limit}</div> : <form className={styles.inputWrapper} onSubmit={handleChatSubmit}>
                <textarea className={styles.chatInput} placeholder={copy.input} aria-label={copy.messageText} value={input} onChange={(e) => { if (e.target.value.length <= 1000) handleInputChange(e); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (isLoading) return; if (isTypingReply) handleStopReply(); if (input.trim() && input.length <= 1000) { shouldAutoScrollRef.current = true; handleSubmit(e); } } }} rows={1} disabled={isLoading} />
                <button type={isReplyBusy ? 'button' : 'submit'} className={`${styles.sendBtn} ${isReplyBusy ? styles.sendBtnStop : ''}`} onClick={isReplyBusy ? handleStopReply : undefined} disabled={!isReplyBusy && !input.trim()} aria-label={isReplyBusy ? copy.stop : copy.send} title={isReplyBusy ? copy.stop : copy.send}>
                  {isReplyBusy ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L14 12 3.3 13.9z" /></svg>}
                </button>
              </form>}</div>
            </>}
          </div>}
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {teaserVisible && !isOpen && <motion.div className={styles.teaser}
          initial={{ opacity: 0, x: -8, scale: 0.99 }} animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.99, transition: { duration: 0.3, ease: 'easeInOut' } }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
          <button className={styles.teaserOpen} type="button" onClick={() => { playTeaserSoundFromAssistantClick(); setShowThread(false); setShowSupport(false); setIsExpanded(false); openPanel(); }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={teaserMode} className={styles.teaserContents} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .24 }}>
                {teaserMode === 'ai' ? <Image src="/images/ai/ai-avatar-profile.svg" alt="" width={48} height={48} className={styles.teaserAvatar} /> : <SupportAvatar size={48} />}
                <span className={styles.teaserText}>
                  <b>{teaserTitle}</b>
                  <span>{teaserText}</span>
                </span>
              </motion.span>
            </AnimatePresence>
          </button>
          <button className={styles.teaserClose} type="button" aria-label={copy.dismiss} onClick={() => { teaserSoundEligibleRef.current = false; dismissTeaser(); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </motion.div>}
      </AnimatePresence>
      <motion.button className={styles.fab} type="button" aria-label={isOpen ? copy.close : copy.open} aria-expanded={isOpen} onClick={() => { if (isOpen) closePanel(); else { playTeaserSoundFromAssistantClick(); openPanel(); } }} initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ x: -2, y: -2 }} whileTap={{ x: 3, y: 3 }}>
        <svg className={styles.fabChatIcon} width="34" height="34" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4C9.4 4 4 8.9 4 15c0 3.1 1.4 5.9 3.7 7.9-.2 1.7-.9 3.2-2 4.4a.6.6 0 0 0 .5 1c2.6-.2 4.6-1.1 6-2.1 1.2.3 2.5.5 3.8.5 6.6 0 12-4.9 12-11S22.6 4 16 4Z" fill="#fff" /><circle cx="11" cy="15" r="1.9" fill="#0878bc" /><circle cx="16" cy="15" r="1.9" fill="#0878bc" /><circle cx="21" cy="15" r="1.9" fill="#38b6ff" stroke="#0878bc" strokeWidth=".8" /></svg>
        <svg className={styles.fabCloseIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        <span className={styles.badge} hidden={badgeCount === 0} aria-label={`${badgeCount} unread messages`}>{badgeCount}</span>
      </motion.button>
    </div>
  );
}
