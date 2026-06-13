import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { personaService } from '@/services/persona.service';
import type { Persona } from '@/types/types';
import { toast } from 'sonner';
import { Send, Square, Loader2, Brain, Globe, Sparkles, Bot, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Streamdown } from 'streamdown';

interface PublicMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TONE_LABELS: Record<string, string> = {
  friendly: 'Friendly',
  professional: 'Professional',
  blunt: 'Blunt',
  playful: 'Playful',
  socratic: 'Socratic',
};

function ThinkingDots({ avatar }: { avatar: string }) {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center text-xl shrink-0">
        {avatar}
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }} />
        ))}
      </div>
    </div>
  );
}

export default function PublicPersonaPage() {
  const { personaId } = useParams<{ personaId: string }>();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loadingPersona, setLoadingPersona] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!personaId) return;
    personaService.getPersonaById(personaId)
      .then(p => { if (!p || !p.is_public) { setNotFound(true); return; } setPersona(p); })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingPersona(false));
  }, [personaId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const stopGeneration = useCallback(() => { abortRef.current?.abort(); }, []);

  async function sendMessage(text: string) {
    if (!persona || !text.trim() || sending) return;
    const userMsg: PublicMessage = { role: 'user', content: text.trim() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setSending(true);
    setStreamingContent('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
        body: JSON.stringify({
          model: persona.ai_model || 'gemini-2.5-flash',
          stream: true, systemPrompt: persona.system_prompt,
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) { const errText = await res.text(); throw new Error(errText || `HTTP ${res.status}`); }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) { accumulated += parsed.token; setStreamingContent(accumulated); }
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* skip malformed */ }
        }
      }
      if (accumulated) setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Failed to get response. The persona may have no credits available.');
      }
    } finally { setSending(false); setStreamingContent(null); abortRef.current = null; }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  if (loadingPersona) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !persona) {
    return (
      <div className="hero-mesh min-h-screen bg-background flex flex-col items-center justify-center gap-5 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-2">Persona not found</h1>
          <p className="text-sm text-muted-foreground max-w-sm text-pretty">
            This persona may have been deleted or set to private.
          </p>
        </div>
        <Link to="/"><Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />Explore Forge</Button></Link>
      </div>
    );
  }

  const avatar = persona.emoji_avatar ?? '🤖';
  const isThinking = sending && (streamingContent === null || streamingContent === '');
  const isStreaming = sending && streamingContent !== null;

  const traits: string[] = [
    persona.tone && TONE_LABELS[persona.tone] ? TONE_LABELS[persona.tone] : null,
    persona.knowledge_domain ?? null,
    persona.memory_enabled ? 'Has Memory' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Persona Hero Banner ── */}
      <div className="shrink-0 relative overflow-hidden">
        {/* gradient bg */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, hsl(262 90% 66% / 0.15) 0%, hsl(316 70% 58% / 0.08) 40%, hsl(240 14% 6% / 0) 100%)' }} />
        {/* grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.25) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
          }}
        />

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          {/* Big avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-125"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
            <div className="relative h-20 w-20 rounded-3xl bg-card border border-border flex items-center justify-center text-5xl shadow-[0_0_40px_hsl(var(--primary)/0.25)]">
              {avatar}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-1 text-balance glow-title" style={{ textShadow: 'none' }}>
              {persona.name}
            </h1>
            {persona.description && (
              <p className="text-sm text-muted-foreground max-w-xs text-pretty leading-relaxed">
                {persona.description}
              </p>
            )}
          </div>

          {/* Trait pills */}
          {traits.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {traits.map(trait => (
                <span key={trait} className="forge-tag forge-tag-violet">
                  {trait}
                </span>
              ))}
              {persona.is_public && (
                <span className="forge-tag forge-tag-green">
                  <Globe className="h-2.5 w-2.5" /> Public
                </span>
              )}
              {persona.memory_enabled && (
                <span className="forge-tag forge-tag-amber">
                  <Brain className="h-2.5 w-2.5" /> Memory
                </span>
              )}
            </div>
          )}

          {/* Sub info */}
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
            Start chatting — no account needed
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* ── Messages ── */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Welcome card */}
          {messages.length === 0 && !sending && (
            <div className="gradient-border-card p-5 text-center animate-fade-up">
              <p className="text-2xl mb-2">{avatar}</p>
              <p className="font-semibold text-sm mb-1">{persona.name} is here</p>
              <p className="text-xs text-muted-foreground text-pretty max-w-xs mx-auto leading-relaxed">
                {persona.description || `Ask me anything — I'm ready to chat.`}
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
                {/* Avatar */}
                <div className={cn(
                  'h-8 w-8 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 text-sm font-semibold',
                  isUser
                    ? 'bg-primary/20 text-primary border border-primary/30 text-[10px]'
                    : 'bg-muted text-lg border border-border',
                )}>
                  {isUser ? 'You' : avatar}
                </div>

                {/* Bubble */}
                <div className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  isUser
                    ? 'text-primary-foreground rounded-tr-sm shadow-[0_4px_20px_hsl(var(--primary)/0.2)]'
                    : 'bg-card border border-border rounded-tl-sm',
                )}
                  style={isUser ? { background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))' } : undefined}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose-chat"><Streamdown>{msg.content}</Streamdown></div>
                  )}
                </div>
              </div>
            );
          })}

          {isThinking && <ThinkingDots avatar={avatar} />}

          {isStreaming && streamingContent !== null && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-2xl bg-muted flex items-center justify-center text-lg shrink-0 mt-0.5">{avatar}</div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[78%]">
                <div className="prose-chat streaming-cursor"><Streamdown>{streamingContent}</Streamdown></div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${persona.name}…`}
              disabled={sending}
              rows={1}
              className="flex-1 min-h-[36px] max-h-[160px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm leading-relaxed"
            />
            {sending ? (
              <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={stopGeneration}>
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button type="button" size="icon" className="h-8 w-8 shrink-0" disabled={!input.trim()} onClick={() => sendMessage(input)}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Powered by Forge footer */}
        <div className="border-t border-border py-3 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              No account needed · Conversations are private
            </p>
            <Link to="/" className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors shrink-0">
              <Sparkles className="h-3 w-3" />
              Powered by Forge
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


interface PublicMessage {
  role: 'user' | 'assistant';
  content: string;
}

