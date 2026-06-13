import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chat.service';
import { imageService } from '@/services/image.service';
import { supabase } from '@/db/supabase';
import type { Conversation, SoloMessage, AIModel } from '@/types/types';
import { toast } from 'sonner';

// A streaming-only message living in memory while the AI is typing
export interface StreamingMessage {
  id: '__streaming__';
  role: 'assistant';
  content: string;
  isStreaming: true;
  created_at: string;
}

export type ChatMessage = SoloMessage | StreamingMessage;

export function useSoloChat(conversationId: string) {
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setConversation(null);
      setLoading(false);
      return;
    }
    loadConversation();
    loadMessages();
    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const data = await chatService.getConversationById(conversationId);
      setConversation(data);
    } catch {
      // silently fail on initial load
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await chatService.getMessages(conversationId);
      setMessages(data as SoloMessage[]);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Auto-rename the conversation after the very first exchange
  const autoRename = useCallback(
    async (userText: string, assistantText: string, convId: string) => {
      try {
        const seed = `${userText} | ${assistantText}`.slice(0, 120);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Call the streaming edge function and collect all tokens into the title
        const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            stream: true,
            messages: [{
              role: 'user',
              content: `Based on this conversation snippet, write a very short title (4–6 words, no quotes, no punctuation at end):\n\n"${seed}"`,
            }],
          }),
        });

        let title = '';
        if (res.ok && res.body) {
          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value, { stream: true }).split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') break outer;
              try { title += JSON.parse(raw)?.token ?? ''; } catch { /* skip malformed */ }
            }
          }
          title = title.trim();
        }

        // Fallback: first 40 chars of user message
        if (!title || title.length < 2) title = userText.slice(0, 40).trim();

        if (title) {
          await chatService.updateConversation(convId, { title });
          setConversation(prev => prev ? { ...prev, title } : prev);
        }
      } catch {
        // Non-critical — silently skip
      }
    },
    []
  );

  const streamMessage = useCallback(
    async (
      userContent: string,
      imageUrl: string | undefined,
      currentMessages: SoloMessage[],
      conv: Conversation,
      systemPrompt?: string
    ): Promise<string> => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: conv.model,
          stream: true,
          ...(systemPrompt ? { systemPrompt } : {}),
          messages: [
            ...currentMessages.map(m => ({
              role: m.role,
              content: m.content,
              image_url: m.image_url,
            })),
            { role: 'user', content: userContent, image_url: imageUrl },
          ],
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(errText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      setStreamingContent('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              fullContent += parsed.token;
              setStreamingContent(fullContent);
            }
          } catch (e: any) {
            if (e?.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      setStreamingContent(null);
      return fullContent;
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, imageUrl?: string, systemPrompt?: string) => {
      if (!conversation) return;
      const isFirstMessage = messages.length === 0;

      try {
        setSending(true);

        // Optimistic user message
        const tempUserMsg: SoloMessage = {
          id: `temp-user-${Date.now()}`,
          conversation_id: conversationId,
          role: 'user',
          content,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMsg]);

        // Persist user message
        const savedUser = await chatService.addMessage({
          conversation_id: conversationId,
          role: 'user',
          content,
          image_url: imageUrl,
        });
        setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? (savedUser as SoloMessage) : m));

        // Build context from in-memory messages (no extra DB round-trip).
        // Cap at the last 40 prior messages to stay within AI context windows.
        const MAX_CONTEXT = 40;
        const contextMsgs = messages.slice(-MAX_CONTEXT);

        const aiContent = await streamMessage(content, imageUrl, contextMsgs, conversation, systemPrompt);

        if (!aiContent.trim()) throw new Error('Empty response from AI');

        // Persist AI message
        const savedAI = await chatService.addMessage({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiContent,
          model: conversation.model,
        });
        setMessages(prev => [...prev, savedAI as SoloMessage]);

        // Auto-rename on first message
        if (isFirstMessage) {
          autoRename(content, aiContent, conversationId);
        }

        // Touch updated_at
        await chatService.updateConversation(conversationId, {
          updated_at: new Date().toISOString(),
        });
      } catch (err: any) {
        setStreamingContent(null);
        const msg: string = err?.message ?? String(err);
        if (msg.includes('API_KEY_MISSING') || msg.includes('No API key')) {
          toast.error('No API key found', {
            description: 'Go to Settings → API Keys and add your key.',
            action: { label: 'Settings', onClick: () => (window.location.href = '/settings') },
          });
        } else if (msg.includes('aborted') || msg.includes('AbortError')) {
          // User stopped generation — that's fine
        } else {
          toast.error('AI response failed', { description: msg.slice(0, 120) });
        }
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [conversation, conversationId, messages, streamMessage, autoRename]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setStreamingContent(null);
    setSending(false);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (sending || messages.length < 2) return;
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const lastUser = [...messages].reverse()[lastUserIdx];
    // Remove last assistant message(s) after it
    const userPos = messages.length - 1 - lastUserIdx;
    const trimmed = messages.slice(0, userPos);
    setMessages(trimmed);
    // Delete last AI message from DB
    const lastAI = messages[messages.length - 1];
    if (lastAI?.role === 'assistant') {
      await chatService.deleteMessage(lastAI.id).catch(() => {});
    }
    // Re-send
    await sendMessage(lastUser.content, lastUser.image_url);
  }, [sending, messages, sendMessage]);

  const generateImage = useCallback(async (prompt: string) => {
    if (!conversation) return;
    try {
      setSending(true);
      const imageUrl = await imageService.generateImage(prompt, conversationId);
      const message = await chatService.addMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: `Generated: **${prompt}**`,
        image_url: imageUrl,
        model: 'nano_banana',
      });
      setMessages(prev => [...prev, message as SoloMessage]);
      return imageUrl;
    } catch (err: any) {
      if (err?.message?.includes('Nano Banana') || err?.message?.includes('No API key')) {
        toast.error('Nano Banana API key missing', {
          description: 'Add a Nano Banana key in Settings.',
          action: { label: 'Settings', onClick: () => (window.location.href = '/settings') },
        });
      } else {
        toast.error('Image generation failed', { description: err?.message });
      }
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversation, conversationId]);

  const switchModel = useCallback(async (newModel: AIModel) => {
    if (!conversation) return;
    await chatService.updateConversation(conversationId, { model: newModel });
    setConversation(prev => prev ? { ...prev, model: newModel } : null);
  }, [conversation, conversationId]);

  const shareConversation = useCallback(async () => {
    const slug = await chatService.shareConversation(conversationId);
    const url = `${window.location.origin}/share/${slug}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Share link copied!');
    return url;
  }, [conversationId]);

  const renameConversation = useCallback(async (title: string) => {
    await chatService.updateConversation(conversationId, { title });
    setConversation(prev => prev ? { ...prev, title } : prev);
  }, [conversationId]);

  return {
    messages,
    conversation,
    loading,
    sending,
    streamingContent,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    generateImage,
    switchModel,
    shareConversation,
    renameConversation,
    refresh: loadMessages,
  };
}
