import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';

export interface PublicMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function usePublicChat(shareToken: string) {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;

    setError(null);
    setSending(true);

    const userMsg: PublicMessage = { id: crypto.randomUUID(), role: 'user', content };
    const loadingMsgId = crypto.randomUUID();
    
    setMessages(prev => [...prev, userMsg, { id: loadingMsgId, role: 'assistant', content: '', isStreaming: true }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/public-chat`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          shareToken,
          messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          throw new Error(parsed.error || 'Server error');
        } catch {
          throw new Error(errText);
        }
      }

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let streamedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value);
          const lines = chunk.split('\n').filter(l => l.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.token) {
                  streamedContent += parsed.token;
                  setMessages(prev => prev.map(m => 
                    m.id === loadingMsgId ? { ...m, content: streamedContent } : m
                  ));
                }
              } catch (e) {
                // Ignore parse errors for split chunks
              }
            }
          }
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId ? { ...m, isStreaming: false } : m
      ));

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setError(err.message || 'Failed to send message');
        // Remove the loading message if it failed
        setMessages(prev => prev.filter(m => m.id !== loadingMsgId));
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [messages, shareToken, sending]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setSending(false);
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
    }
  }, []);

  return {
    messages,
    sending,
    error,
    sendMessage,
    stopGeneration
  };
}
