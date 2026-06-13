import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Plus, Send, Square, Trash2, Users, X,
  MessageSquare, Loader2,
  Pencil, Check, Sparkles, UserPlus, Zap, LayoutGrid, List, Brain,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { personaService } from '@/services/persona.service';
import { Streamdown } from 'streamdown';
import type {
  GroupChatSession, GroupChatMessage, GroupChatPersona, GroupChatSSEEvent, Persona,
} from '@/types/types';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const PERSONA_COLORS = [
  '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Persona avatar chip ───────────────────────────────────────────────────────

function PersonaChip({
  persona, onRemove, size = 'md',
}: { persona: GroupChatPersona; onRemove?: () => void; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      )}
      style={{ borderColor: persona.color + '50', backgroundColor: persona.color + '18', color: persona.color }}
    >
      <span className="text-sm leading-none">{persona.emoji}</span>
      <span>{persona.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: GroupChatMessage;
  isStreaming?: boolean;
  compact?: boolean;
}

function Bubble({ msg, isStreaming, compact }: BubbleProps) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[78%] md:max-w-[65%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed bg-gradient-to-br from-primary to-[hsl(316_70%_52%)] text-white shadow-[0_4px_16px_hsl(var(--primary)/0.25)]">
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const color = msg.persona_color ?? '#7c3aed';
  return (
    <div className={cn('flex items-start gap-3', compact ? 'mb-3' : 'mb-5')}>
      {/* Persona avatar */}
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm border"
        style={{ borderColor: color + '40', backgroundColor: color + '15' }}
      >
        {msg.persona_emoji ?? '🤖'}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold" style={{ color }}>{msg.persona_name}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(msg.timestamp)}</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-primary animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              writing…
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed border shadow-sm"
          style={{ borderColor: color + '25', backgroundColor: color + '08' }}
        >
          {isStreaming && !msg.content ? (
            <div className="flex gap-1 items-center py-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: color, animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
                />
              ))}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_strong]:font-semibold">
              <Streamdown>{msg.content + (isStreaming ? '▍' : '')}</Streamdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Perspective Grid: shows same-round AI responses side-by-side ──────────────

function PerspectiveGrid({
  userMsg,
  responses,
  streamingMsgs,
  activePersonaId,
}: {
  userMsg: GroupChatMessage;
  responses: GroupChatMessage[];
  streamingMsgs: Map<string, GroupChatMessage>;
  activePersonaId: string | null;
}) {
  // Merge committed + streaming for each persona in this round
  const allPersonaIds = [
    ...new Set([
      ...responses.map(r => r.persona_id).filter(Boolean),
      ...Array.from(streamingMsgs.keys()),
    ]),
  ] as string[];

  const getMsg = (pid: string): GroupChatMessage | undefined =>
    responses.find(r => r.persona_id === pid) ?? streamingMsgs.get(pid);

  const cols = allPersonaIds.length <= 2 ? 'md:grid-cols-2' :
               allPersonaIds.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className="mb-6">
      {/* User question */}
      <div className="flex justify-end mb-4">
        <div className="max-w-[78%] md:max-w-[65%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed bg-gradient-to-br from-primary to-[hsl(316_70%_52%)] text-white shadow-[0_4px_16px_hsl(var(--primary)/0.25)]">
            <p className="whitespace-pre-wrap break-words">{userMsg.content}</p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2">
          {allPersonaIds.length} perspectives
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Perspective cards grid */}
      <div className={cn('grid grid-cols-1 gap-3', cols)}>
        {allPersonaIds.map(pid => {
          const msg = getMsg(pid);
          if (!msg) return null;
          const isStreaming = pid === activePersonaId || (streamingMsgs.has(pid) && !responses.find(r => r.persona_id === pid));
          const color = msg.persona_color ?? '#7c3aed';
          return (
            <div
              key={pid}
              className="rounded-2xl border bg-card p-4 flex flex-col gap-2 shadow-sm h-full transition-all duration-200"
              style={{ borderColor: color + '35' }}
            >
              {/* Persona header */}
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-base border shrink-0"
                  style={{ borderColor: color + '40', backgroundColor: color + '18' }}
                >
                  {msg.persona_emoji ?? '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color }}>{msg.persona_name}</p>
                  {isStreaming && (
                    <div className="flex gap-0.5 mt-0.5">
                      {[0,1,2].map(i => (
                        <span key={i} className="h-1 w-1 rounded-full animate-bounce"
                          style={{ backgroundColor: color, animationDelay: `${i*150}ms`, animationDuration: '0.8s' }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-sm text-foreground/90 leading-relaxed">
                {isStreaming && !msg.content ? (
                  <div className="flex gap-1 items-center py-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: color, animationDelay: `${i*150}ms` }} />
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm">
                    <Streamdown>{msg.content + (isStreaming ? '▍' : '')}</Streamdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Persona Selector Panel ────────────────────────────────────────────────────

function PersonaSelectorPanel({
  allPersonas,
  selectedIds,
  onAdd,
  onRemove,
}: {
  allPersonas: Persona[];
  selectedIds: string[];
  onAdd: (p: Persona) => void;
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? allPersonas.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : allPersonas;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Add Personas ({selectedIds.length}/6)
        </p>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search personas…"
          className="h-8 text-xs"
        />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No personas found</p>
          )}
          {filtered.map(p => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!isSelected && selectedIds.length >= 6}
                onClick={() => isSelected ? onRemove(p.id) : onAdd(p)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm',
                  isSelected
                    ? 'bg-primary/10 border border-primary/25 text-primary'
                    : 'hover:bg-muted/50 border border-transparent text-foreground disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <span className="text-base leading-none shrink-0">{p.emoji_avatar ?? '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                  )}
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {allPersonas.length === 0 && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">
            No personas yet.{' '}
            <a href="/personas/create" className="text-primary hover:underline">Create one →</a>
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sessions List Page
// ══════════════════════════════════════════════════════════════════════════════

function GroupChatSessionsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<GroupChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoCreating, setAutoCreating] = useState(false);

  // If navigated from PersonaListPage with ?persona=id&name=X, auto-create and redirect
  useEffect(() => {
    const personaId  = searchParams.get('persona');
    const personaName = searchParams.get('name');
    if (!personaId) return;

    setAutoCreating(true);
    (async () => {
      // Load full persona to build GroupChatPersona config
      const all = await personaService.getPersonas();
      const found = all.find(p => p.id === personaId);
      const preloaded: GroupChatPersona[] = found
        ? [{
            id: found.id,
            name: found.name,
            emoji: found.emoji_avatar ?? '🤖',
            system_prompt: found.system_prompt ?? '',
            model: 'gemini-2.5-flash',
            color: PERSONA_COLORS[0],
          }]
        : [];

      const title = found
        ? `Chat with ${found.name}`
        : (personaName ? `Chat with ${personaName}` : 'New Group Chat');

      const { data } = await supabase
        .from('group_chat_sessions')
        .insert({
          title,
          persona_ids: preloaded.map(p => p.id),
          personas: preloaded,
          messages: [],
        })
        .select()
        .maybeSingle();

      if (data) {
        navigate(`/group-chat/${data.id}`, { replace: true });
      } else {
        toast.error('Failed to create session');
        setAutoCreating(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoCreating) return;
    supabase
      .from('group_chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions((data ?? []) as GroupChatSession[]);
        setLoading(false);
      });
  }, [autoCreating]);

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('group_chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Session deleted');
  };

  const createNew = async () => {
    const { data } = await supabase
      .from('group_chat_sessions')
      .insert({ title: 'New Group Chat', persona_ids: [], personas: [], messages: [] })
      .select()
      .maybeSingle();
    if (data) navigate(`/group-chat/${data.id}`);
  };

  // Show spinner while auto-creating from persona deeplink
  if (autoCreating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Setting up your group chat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="h-4 w-4 text-violet-400 shrink-0" />
            <h1 className="font-bold truncate">Group Chat</h1>
            <span className="hidden md:inline text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
          </div>
          <Button onClick={createNew} className="gap-2 shrink-0 h-8 text-sm">
            <Plus className="h-3.5 w-3.5" />New Chat
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Hero */}
        <div className="gc-hero rounded-2xl p-6 md:p-8 mb-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Unique to Forge — not available anywhere else
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-balance">
              3 AI Perspectives. One question.
            </h2>
            <p className="text-white/70 text-sm max-w-lg mx-auto text-pretty mb-5">
              Unlike generic AI comparisons, Forge personas have <strong className="text-white/90">real personalities, memory, and opinions</strong>.
              Watch a Philosopher, an Entrepreneur, and a Scientist debate your question live — each reacting to what the others said.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={createNew} className="gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white h-10">
                <Plus className="h-4 w-4" />Custom Chat
              </Button>
              <Button onClick={createNew} className="gap-2 bg-white text-slate-900 hover:bg-white/90 h-10 font-semibold">
                <Brain className="h-4 w-4" />3-Perspective Debate
              </Button>
            </div>
          </div>
        </div>

        {/* Differentiation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              color: '#7c3aed',
              icon: '🧠',
              title: 'Personalities, not models',
              desc: 'Each persona has a unique character and reasoning style — not just a different AI provider.',
            },
            {
              color: '#0ea5e9',
              icon: '👁',
              title: 'Context-aware debate',
              desc: 'Each persona reads what the others said and responds accordingly — real debate, not parallel monologues.',
            },
            {
              color: '#10b981',
              icon: '💡',
              title: 'Persistent memory',
              desc: 'Your personas remember past conversations and evolve their thinking over time.',
            },
          ].map(item => (
            <div key={item.title} className="forge-card p-4 flex gap-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg border"
                style={{ borderColor: item.color + '40', background: item.color + '15' }}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground text-pretty">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { icon: '⚡', label: '2–6 personas per session' },
            { icon: '👁', label: 'Each persona sees prior responses' },
            { icon: '💬', label: 'Live streaming per persona' },
            { icon: '💾', label: 'Sessions auto-saved' },
            { icon: '🔲', label: 'Side-by-side perspective grid' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs font-medium">
              <span>{f.icon}</span>
              <span className="text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Your Sessions</h3>
            <span className="text-xs text-muted-foreground">{sessions.length} saved</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="forge-card p-10 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold mb-1">No sessions yet</p>
              <p className="text-sm text-muted-foreground">Your group chat sessions will appear here after you create them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/group-chat/${s.id}`)}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/group-chat/${s.id}`)}
                  className="forge-card p-4 cursor-pointer hover:border-primary/30 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-semibold text-sm truncate">{s.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(s.updated_at)}
                        </span>
                      </div>
                      {/* Persona chips */}
                      {Array.isArray(s.personas) && s.personas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(s.personas as GroupChatPersona[]).slice(0, 4).map((p, i) => (
                            <PersonaChip key={p.id} persona={p} size="sm" />
                          ))}
                          {s.personas.length > 4 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{s.personas.length - 4} more</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(s.messages) ? s.messages.length : 0} messages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                      onClick={e => deleteSession(s.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Group Chat Room
// ══════════════════════════════════════════════════════════════════════════════

function GroupChatRoom({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();

  // Session state
  const [session, setSession]         = useState<GroupChatSession | null>(null);
  const [loading, setLoading]         = useState(true);
  const [personas, setPersonas]       = useState<GroupChatPersona[]>([]);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [messages, setMessages]       = useState<GroupChatMessage[]>([]);

  // Chat state
  const [input, setInput]             = useState('');
  const [running, setRunning]         = useState(false);
  const [streamingMsgs, setStreamingMsgs] = useState<Map<string, GroupChatMessage>>(new Map());
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  // UI state
  const [showSelector, setShowSelector] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle]             = useState('New Group Chat');
  const [selectorOpen, setSelectorOpen] = useState(false);
  // 'grid' = perspective side-by-side view; 'thread' = sequential thread view
  const [viewMode, setViewMode]         = useState<'grid' | 'thread'>('grid');

  const abortRef    = useRef<AbortController | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  // Load session + personas
  useEffect(() => {
    Promise.all([
      supabase.from('group_chat_sessions').select('*').eq('id', sessionId).maybeSingle(),
      personaService.getPersonas(),
    ]).then(([{ data: sess }, pData]) => {
      if (sess) {
        const s = sess as GroupChatSession;
        setSession(s);
        setTitle(s.title);
        setPersonas(Array.isArray(s.personas) ? (s.personas as GroupChatPersona[]) : []);
        setMessages(Array.isArray(s.messages) ? (s.messages as GroupChatMessage[]) : []);
      }
      setAllPersonas(pData || []);
      setLoading(false);
    });
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsgs]);

  // Show selector if no personas yet
  useEffect(() => {
    if (!loading && personas.length === 0) setSelectorOpen(true);
  }, [loading, personas.length]);

  const saveSession = useCallback(async (updatedPersonas?: GroupChatPersona[], updatedMessages?: GroupChatMessage[], updatedTitle?: string) => {
    const p = updatedPersonas ?? personas;
    const m = updatedMessages ?? messages;
    const t = updatedTitle ?? title;
    await supabase
      .from('group_chat_sessions')
      .update({
        title: t,
        persona_ids: p.map(x => x.id),
        personas: p,
        messages: m,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }, [sessionId, personas, messages, title]);

  const addPersona = (p: Persona) => {
    if (personas.length >= 6) { toast.error('Maximum 6 personas'); return; }
    const color = PERSONA_COLORS[personas.length % PERSONA_COLORS.length];
    const gp: GroupChatPersona = {
      id: p.id, name: p.name, emoji: p.emoji_avatar ?? '🤖',
      system_prompt: p.system_prompt ?? '', model: p.ai_model, color,
    };
    const next = [...personas, gp];
    setPersonas(next);
    saveSession(next);
    toast.success(`${p.name} joined the chat`);
  };

  const removePersona = (id: string) => {
    const next = personas.filter(p => p.id !== id);
    setPersonas(next);
    saveSession(next);
  };

  const updateTitle = async () => {
    setEditingTitle(false);
    await supabase.from('group_chat_sessions').update({ title }).eq('id', sessionId);
  };

  const abort = () => {
    abortRef.current?.abort();
    setRunning(false);
    setActivePersonaId(null);
    setStreamingMsgs(new Map());
  };

  const send = async () => {
    if (!input.trim()) return;
    if (personas.length < 2) { toast.error('Add at least 2 personas to start a group chat'); setSelectorOpen(true); return; }
    if (running) return;

    const userMsg: GroupChatMessage = {
      id: nanoid(), role: 'user', content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setRunning(true);

    // Pre-create streaming slots for each persona
    const newStreamMap = new Map<string, GroupChatMessage>();
    for (const p of personas) {
      newStreamMap.set(p.id, {
        id: nanoid(), role: 'assistant',
        persona_id: p.id, persona_name: p.name,
        persona_emoji: p.emoji, persona_color: p.color,
        content: '', timestamp: new Date().toISOString(),
      });
    }
    setStreamingMsgs(newStreamMap);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const completedPersonaMsgs: GroupChatMessage[] = [];

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/group-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_message: userMsg.content,
          personas: personas.map(p => ({
            id: p.id, name: p.name, emoji: p.emoji,
            system_prompt: p.system_prompt, model: p.model,
          })),
          history: messages.slice(-20).map(m => ({
            role: m.role,
            persona_id: m.persona_id,
            persona_name: m.persona_name,
            content: m.content,
          })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          let evt: GroupChatSSEEvent;
          try { evt = JSON.parse(payload); } catch { continue; }

          switch (evt.type) {
            case 'persona_start':
              setActivePersonaId(evt.persona_id);
              setStreamingMsgs(prev => {
                const next = new Map(prev);
                const existing = next.get(evt.persona_id);
                if (existing) next.set(evt.persona_id, { ...existing, content: '' });
                return next;
              });
              break;

            case 'token':
              setStreamingMsgs(prev => {
                const next = new Map(prev);
                const existing = next.get(evt.persona_id);
                if (existing) next.set(evt.persona_id, { ...existing, content: existing.content + evt.content });
                return next;
              });
              break;

            case 'persona_done': {
              const slot = newStreamMap.get(evt.persona_id);
              const finishedMsg: GroupChatMessage = {
                id: slot?.id ?? nanoid(),
                role: 'assistant',
                persona_id: evt.persona_id,
                persona_name: evt.persona_name,
                persona_emoji: slot?.persona_emoji,
                persona_color: slot?.persona_color,
                content: evt.full_content,
                timestamp: new Date().toISOString(),
              };
              completedPersonaMsgs.push(finishedMsg);
              setStreamingMsgs(prev => {
                const next = new Map(prev);
                next.delete(evt.persona_id);
                return next;
              });
              setActivePersonaId(null);
              break;
            }

            case 'persona_error':
              toast.error(`${evt.persona_name}: ${evt.message}`);
              setStreamingMsgs(prev => {
                const next = new Map(prev);
                next.delete(evt.persona_id);
                return next;
              });
              break;

            case 'session_done': {
              const allNew = [userMsg, ...completedPersonaMsgs];
              const finalMessages = [...messages, ...allNew];
              setMessages(finalMessages);
              setStreamingMsgs(new Map());
              setActivePersonaId(null);
              setRunning(false);
              saveSession(undefined, finalMessages);
              break;
            }

            case 'error':
              toast.error(evt.message);
              setRunning(false);
              setStreamingMsgs(new Map());
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      toast.error(String(err));
      setRunning(false);
      setStreamingMsgs(new Map());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  // Build the display message list: committed messages + currently streaming ones
  const streamingList = Array.from(streamingMsgs.values());

  // Build "rounds" for perspective grid view:
  // Each round = { userMsg, responses[] }
  // A new round starts each time a user message appears in the committed list.
  const rounds = (() => {
    const result: { userMsg: GroupChatMessage; responses: GroupChatMessage[] }[] = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        result.push({ userMsg: msg, responses: [] });
      } else if (result.length > 0) {
        result[result.length - 1].responses.push(msg);
      }
    }
    return result;
  })();

  // Is a round currently streaming (user msg committed but AI not done)?
  const isRoundStreaming = streamingMsgs.size > 0 || running;

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/group-chat')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Title */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-7 text-sm font-semibold"
                  onKeyDown={e => e.key === 'Enter' && updateTitle()}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={updateTitle}>
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 group min-w-0"
                onClick={() => setEditingTitle(true)}
              >
                <span className="font-semibold text-sm truncate">{title}</span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
            )}
          </div>

          {/* Persona chips (header) */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
            {personas.slice(0, 3).map(p => (
              <PersonaChip key={p.id} persona={p} size="sm" />
            ))}
            {personas.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{personas.length - 3}</span>
            )}
          </div>

          {/* Add persona button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setSelectorOpen(v => !v)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Personas</span>
            <span className="text-[10px] text-muted-foreground">({personas.length})</span>
          </Button>

          {/* View toggle: grid vs thread */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={viewMode === 'grid' ? 'Switch to thread view' : 'Switch to perspective grid'}
            onClick={() => setViewMode(v => v === 'grid' ? 'thread' : 'grid')}
          >
            {viewMode === 'grid'
              ? <List className="h-4 w-4" />
              : <LayoutGrid className="h-4 w-4" />}
          </Button>
        </div>

        {/* Active persona indicator */}
        {activePersonaId && (() => {
          const p = personas.find(x => x.id === activePersonaId);
          if (!p) return null;
          return (
            <div
              className="px-4 py-1.5 flex items-center gap-2 text-xs border-t"
              style={{ borderColor: p.color + '25', backgroundColor: p.color + '08' }}
            >
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: p.color }} />
              <span style={{ color: p.color }} className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">is responding…</span>
            </div>
          );
        })()}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Persona selector sidebar — desktop inline, mobile Sheet ── */}

        {/* Desktop: inline sidebar */}
        {selectorOpen && (
          <div className="hidden md:flex w-64 shrink-0 border-r border-border bg-card/50 flex-col">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border">
              <p className="text-xs font-semibold">Personas in Chat</p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectorOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {personas.length > 0 && (
              <div className="px-3 py-2 border-b border-border flex flex-col gap-1.5">
                {personas.map(p => (
                  <PersonaChip key={p.id} persona={p} onRemove={() => removePersona(p.id)} />
                ))}
                {personas.length < 2 && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                    <Zap className="h-3 w-3" />Need at least 2 personas
                  </p>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0">
              <PersonaSelectorPanel
                allPersonas={allPersonas}
                selectedIds={personas.map(p => p.id)}
                onAdd={addPersona}
                onRemove={removePersona}
              />
            </div>
          </div>
        )}

        {/* Mobile: Sheet overlay */}
        <Sheet open={selectorOpen} onOpenChange={setSelectorOpen}>
          <SheetContent side="left" className="md:hidden p-0 w-72 bg-card border-border flex flex-col">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border">
              <p className="text-xs font-semibold">Personas in Chat</p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectorOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {personas.length > 0 && (
              <div className="px-3 py-2 border-b border-border flex flex-col gap-1.5">
                {personas.map(p => (
                  <PersonaChip key={p.id} persona={p} onRemove={() => removePersona(p.id)} />
                ))}
                {personas.length < 2 && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                    <Zap className="h-3 w-3" />Need at least 2 personas
                  </p>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0">
              <PersonaSelectorPanel
                allPersonas={allPersonas}
                selectedIds={personas.map(p => p.id)}
                onAdd={addPersona}
                onRemove={removePersona}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Chat area ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-6 max-w-4xl mx-auto">
              {/* Empty state */}
              {messages.length === 0 && streamingList.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4">🗣️</div>
                  <p className="font-bold text-lg mb-2">Start the conversation</p>
                  <p className="text-sm text-muted-foreground max-w-xs text-pretty mb-2">
                    {personas.length < 2
                      ? 'Add at least 2 personas using the Personas button above, then send a message.'
                      : `${personas.map(p => p.name).join(', ')} are ready.`}
                  </p>
                  {personas.length >= 2 && (
                    <>
                      <p className="text-xs text-muted-foreground mb-5">
                        Viewing in{' '}
                        <span className="font-semibold text-primary">
                          {viewMode === 'grid' ? 'Perspective Grid' : 'Thread'} mode
                        </span>
                        {' '} — toggle with the grid icon in the header.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                        {[
                          'What is the most important challenge facing humanity right now?',
                          'Explain the trade-offs between privacy and convenience in tech.',
                          'Is remote work better or worse for society overall?',
                          'What are the biggest risks of AI in the next decade?',
                          'How should society balance innovation with regulation?',
                          'What makes a truly great leader?',
                        ].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setInput(s)}
                            className="text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/20 transition-all text-xs text-muted-foreground hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── GRID VIEW: perspective cards per round ── */}
              {viewMode === 'grid' && (
                <>
                  {rounds.map((round, i) => {
                    const isLastRound = i === rounds.length - 1;
                    const streamingForRound = isLastRound && isRoundStreaming ? streamingMsgs : new Map();
                    return (
                      <PerspectiveGrid
                        key={round.userMsg.id}
                        userMsg={round.userMsg}
                        responses={round.responses}
                        streamingMsgs={streamingForRound}
                        activePersonaId={activePersonaId}
                      />
                    );
                  })}
                  {/* Streaming for a new round not yet committed */}
                  {messages.length > 0 && isRoundStreaming && rounds.length === 0 && (
                    <PerspectiveGrid
                      key="streaming-round"
                      userMsg={messages[messages.length - 1]}
                      responses={[]}
                      streamingMsgs={streamingMsgs}
                      activePersonaId={activePersonaId}
                    />
                  )}
                </>
              )}

              {/* ── THREAD VIEW: sequential bubbles ── */}
              {viewMode === 'thread' && (
                <>
                  {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
                  {streamingList.map(msg => (
                    <Bubble
                      key={msg.id}
                      msg={msg}
                      isStreaming={msg.persona_id === activePersonaId || msg.content.length > 0}
                    />
                  ))}
                </>
              )}

              <div ref={bottomRef} className="h-4" />
            </div>
          </ScrollArea>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
            <div className="max-w-3xl mx-auto">
              {/* Persona chips (mobile only) */}
              {personas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 md:hidden">
                  {personas.map(p => (
                    <PersonaChip key={p.id} persona={p} size="sm" />
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={personas.length < 2 ? 'Add 2+ personas first…' : `Message all ${personas.length} personas…`}
                  disabled={running || personas.length < 2}
                  rows={1}
                  className="flex-1 min-h-[36px] max-h-[150px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm"
                />
                <div className="flex items-center gap-1 shrink-0 pb-0.5">
                  {running ? (
                    <Button size="icon" className="h-8 w-8" onClick={abort}>
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      disabled={!input.trim() || personas.length < 2}
                      onClick={send}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {personas.length >= 2 && (
                <p className="text-center text-[10px] text-muted-foreground mt-1.5">
                  <span className="font-medium">{personas.length} personas</span> will respond in sequence
                  · <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> send
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Router wrapper ─────────────────────────────────────────────────────────────

export default function GroupChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  if (sessionId) return <GroupChatRoom sessionId={sessionId} />;
  return <GroupChatSessionsList />;
}
