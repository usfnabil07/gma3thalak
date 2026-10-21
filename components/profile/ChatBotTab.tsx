'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { Send, MessageSquareText, Calculator, GraduationCap, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import styles from './ChatBotTab.module.css';
import profileStyles from '@/app/profile/page.module.css';

const CodeRenderer = ({ className, children, ...props }: any) => {
  const isBlock = className?.startsWith('language-');
  const lang = (className || '').replace('language-', '') || 'text';
  if (isBlock) {
    return (
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          <span className={styles.codeLang}>{lang}</span>
          <div className={styles.codeDots}><span /><span /><span /></div>
        </div>
        <SyntaxHighlighter
          language={lang}
          style={atomOneDark}
          customStyle={{ 
            margin: 0, 
            borderRadius: 0, 
            fontSize: '0.9rem', 
            background: '#1e1e1e', 
            direction: 'ltr', 
            textAlign: 'left' 
          }}
          PreTag="div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={styles.inlineCode} {...props}>{children}</code>;
};

const markdownComponents = { code: CodeRenderer };

const useProgressiveText = (target: string, enabled: boolean) => {
  const [visible, setVisible] = useState(enabled ? '' : target);

  useEffect(() => {
    if (!enabled) {
      setVisible(target);
      return;
    }

    let timer = 0;
    const reveal = () => {
      setVisible(current => {
        if (current.length >= target.length) return current;
        const nextLength = Math.min(current.length + 2, target.length);
        if (nextLength < target.length) {
          timer = window.setTimeout(reveal, 18);
        }
        return target.slice(0, nextLength);
      });
    };

    if (target.length > 0) timer = window.setTimeout(reveal, 18);
    return () => window.clearTimeout(timer);
  }, [target, enabled]);

  return visible;
};

const MemoizedChatMessage = memo(({ msg, animate }: { msg: any; animate: boolean }) => {
  const visibleContent = useProgressiveText(msg.content || '', animate);

  return (
    <div className={`${styles.messageBubble} ${msg.role === 'assistant' ? styles.bubbleBot : styles.bubbleUser}`}>
      {msg.role === 'assistant' ? (
        <div className={`${styles.markdownContent} ${animate ? styles.typewriterContent : ''}`}><div className={styles.aiBubbleLabel}><span className={styles.aiBubbleName}>لبيب</span><span>مساعدك الدراسي</span></div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {visibleContent}
          </ReactMarkdown>
        </div>
      ) : (
        msg.content
      )}
    </div>
  );
});

import { useChatContext } from '@/components/chat/ChatContext';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { AI_DEFAULT_AVATAR, AI_THINKING_AVATAR, getAiAvatar } from '@/lib/aiAvatar';

export default function ChatBotTab() {
  const { profile } = useAuth();
  const { messages, input, handleInputChange, handleSubmit, isLoading, append, error } = useChatContext();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatBodyRef.current) {
      requestAnimationFrame(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isLoading]);

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader}>
        <div style={{ width: 40, height: 40, flexShrink: 0 }}>
          <Image src={AI_DEFAULT_AVATAR} alt="Labeeb AI" width={40} height={40} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
        </div>
        <h2 className={profileStyles.sectionHeaderTitle}>المساعد الذكي - لبيب</h2>
      </div>

      <div className={styles.chatContainer}>
        {/* Chat Body */}
        <div className={styles.chatBody} ref={chatBodyRef}>
          {messages.length === 0 ? (
            <div className={styles.welcomeArea}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-dark)' }}>
                جاهز لمساعدتك في أي وقت!
              </h3>
              <p className={styles.welcomeText}>
                يمكنك سؤالي عن لوائح الكلية، حساب معدلك التراكمي، تنظيم وقت فراغك، أو حتى طلب نصائح دراسية للتفوق في موادك.
              </p>
              
              <div className={styles.suggestions}>
                <button className={styles.suggestionBtn} onClick={() => append({ role: 'user', content: 'احسبلي التراكمي بتاعي لو جبت A في البرمجة' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <Calculator size={18} /> معدل الـ GPA
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px' }}>احسبلي التراكمي بتاعي لو جبت A في البرمجة</span>
                </button>
                <button className={styles.suggestionBtn} onClick={() => append({ role: 'user', content: 'أين أجد لائحة كليتي؟' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <GraduationCap size={18} /> لوائح وقوانين
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px' }}>أين أجد لائحة كليتي وما شروط التخرج؟</span>
                </button>
                <button className={styles.suggestionBtn} onClick={() => append({ role: 'user', content: 'عندي إيه بكرا في الجدول؟' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <MessageSquareText size={18} /> الجدول اليومي
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px' }}>عندي إيه بكرا في الجدول؟</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg: any) => (
              <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'assistant' ? styles.messageRowBot : styles.messageRowUser}`}>
                  <MemoizedChatMessage msg={msg} animate={isLoading && msg.role === 'assistant'} />
                  {msg.role === 'assistant' && (
                    <div className={styles.messageAvatar}>
                      <Image src={getAiAvatar(msg.content || '')} alt="" aria-hidden="true" width={100} height={120} className={styles.messageMascot} />
                    </div>
                  )}
              </div>
            ))
          )}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && !error && (
            <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
              <div className={`${styles.messageBubble} ${styles.bubbleBot} ${styles.typingIndicator}`}>
                <div className={styles.typingDot}></div>
                <div className={styles.typingDot}></div>
                <div className={styles.typingDot}></div>
              </div>
              <div className={styles.messageAvatar}>
                <Image src={AI_THINKING_AVATAR} alt="" aria-hidden="true" width={100} height={120} className={styles.messageMascot} />
              </div>
            </div>
          )}

          {error && (
            <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
              <div className={`${styles.messageBubble} ${styles.bubbleBot}`}>
                حصل خطأ في الاتصال يا صديقي، جرب تاني بعد شوية.
              </div>
            </div>
          )}
        </div>

        {/* Chat Footer / Input */}
        <div className={styles.chatFooter}>
          {messages.filter((m: any) => m.role === 'user').length >= 7 && profile?.role !== 'superadmin' ? (
            <div className={styles.inputWrapper} style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', justifyContent: 'center', padding: '14px' }}>
              <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} />
                استنفذت الحد الأقصى (7 رسائل)، عد بعد 24 ساعة
              </span>
            </div>
          ) : (
            <form 
              className={styles.inputWrapper} 
              onSubmit={handleSubmit}
            >
              <textarea 
                className={styles.chatInput}
                placeholder="تحدث معي، اسألني عن أي شيء يخص دراستك..."
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) {
                    handleInputChange(e);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((input || '').trim() && (input || '').length <= 1000) {
                      handleSubmit({ preventDefault: () => {} } as any);
                    }
                  }
                }}
                rows={1}
                disabled={isLoading}
              />
              <button type="submit" className={styles.sendBtn} disabled={!(input || '').trim() || isLoading}>
                <Send size={20} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

