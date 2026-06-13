import { useState, useEffect, useRef, useCallback } from 'react';
import OnboardingModal, { useOnboarding } from '@/components/onboarding/OnboardingModal';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { chatService } from '@/services/chat.service';
import { useSoloChat } from '@/hooks/use-solo-chat';
import { supabase } from '@/db/supabase';
import { AI_MODELS, MODELS_BY_PROVIDER } from '@/lib/models';
import {
  Send,
  Plus,
  Menu,
  Key,
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  Bot,
  User,
  Trash2,
  Copy,
  RotateCcw,
  Square,
  Share2,
  Pencil,
  Check,
  X,
  ChevronDown,
  Users,
  Sun,
  Moon,
  Search,
  Cpu,
  Sword,
  Globe,
  TrendingUp,
  FlaskConical,
  LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Streamdown } from 'streamdown';
import type { Conversation, AIModel, Group } from '@/types/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupConversationsByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const lastWeek = new Date(today.getTime() - 7 * 86_400_000);
  const lastMonth = new Date(today.getTime() - 30 * 86_400_000);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    'Last 30 days': [],
    Older: [],
  };

  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= today) groups['Today'].push(c);
    else if (d >= yesterday) groups['Yesterday'].push(c);
    else if (d >= lastWeek) groups['Last 7 days'].push(c);
    else if (d >= lastMonth) groups['Last 30 days'].push(c);
    else groups['Older'].push(c);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

const PROMPT_SUGGESTIONS = [
  { icon: '✍️', title: 'Write for me', prompt: 'Write a compelling cover letter for a software engineer role at a startup.' },
  { icon: '🔍', title: 'Explain it', prompt: 'Explain how transformer neural networks work like I\'m 16 years old.' },
  { icon: '🐞', title: 'Debug code', prompt: 'Here\'s my code — can you find the bug and explain what\'s wrong?' },
  { icon: '🌐', title: 'Translate', prompt: 'Translate the following text into Spanish and explain any nuances.' },
  { icon: '🎯', title: 'Plan it', prompt: 'Create a detailed 30-day learning plan for mastering TypeScript.' },
  { icon: '💡', title: 'Brainstorm', prompt: 'Give me 10 creative app ideas for solving everyday urban problems.' },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  isStreaming?: boolean;
  onCopy: () => void;
  onRetry?: () => void;
}

function MessageBubble({ role, content, imageUrl, isStreaming, onCopy, onRetry }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('group flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold',
          isUser
            ? 'bg-gradient-to-br from-primary to-[hsl(316_70%_52%)] text-white shadow-[0_2px_12px_hsl(var(--primary)/0.35)]'
            : 'bg-card border border-border text-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 min-w-0 max-w-[82%]', isUser && 'items-end')}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Attached"
            className="rounded-2xl max-h-80 object-contain border border-border mb-1"
          />
        )}

        <div
          className={cn(
            'relative rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-gradient-to-br from-primary to-[hsl(316_70%_52%)] text-white rounded-tr-sm shadow-[0_4px_20px_hsl(var(--primary)/0.2)]'
              : 'bg-card border border-border rounded-tl-sm shadow-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : isStreaming && !content ? (
            <ThinkingDots />
          ) : (
            <div className={cn('prose-chat', isStreaming && 'streaming-cursor')}>
              <Streamdown>{content}</Streamdown>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isStreaming && content && (
          <div className={cn(
            'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
              {!isUser && onRetry && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRetry}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

interface SidebarContentProps {
  conversations: Conversation[];
  currentId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNew: () => void;
  onSettings: () => void;
  onClose?: () => void;
}

/** Returns room IDs that the user has joined (persisted in sessionStorage). */
function getJoinedRoomIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    const match = key.match(/^forge_room_(.+)_name$/);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function SidebarContent({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNew,
  onSettings,
  onClose,
}: SidebarContentProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState<Group[]>([]);
  const [roomsExpanded, setRoomsExpanded] = useState(true);

  // Load joined rooms from Supabase on mount
  useEffect(() => {
    const ids = getJoinedRoomIds();
    if (ids.length === 0) return;
    supabase
      .from('groups')
      .select('id, name, topic, join_code, room_type, participant_count, created_at, updated_at, ai_model, ai_persona_name, ai_system_prompt')
      .in('id', ids)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setRooms(data as Group[]);
      });
  }, []);

  const filtered = search.trim()
    ? conversations.filter(c =>
        (c.title || 'New conversation').toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const groups = groupConversationsByDate(filtered);

  return (
    <div className="flex flex-col h-full bg-sidebar-background text-sidebar-foreground">
      {/* Brand — gradient logo area */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <button
            type="button"
            onClick={() => { navigate('/'); onClose?.(); }}
            className="relative h-8 w-8 rounded-xl flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}
            title="Back to Dashboard"
          >
            <Bot className="h-4 w-4 text-white" />
            <div className="absolute inset-0 rounded-xl opacity-40 blur-sm"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
          </button>
          <button
            type="button"
            onClick={() => { navigate('/'); onClose?.(); }}
            className="font-bold text-sidebar-accent-foreground text-base tracking-tight hover:text-white transition-colors"
          >
            Forge
          </button>
          <span className="badge-beta ml-1">Beta</span>
        </div>
        <Button
          onClick={() => { onNew(); onClose?.(); }}
          className="w-full h-9 justify-start gap-2 font-medium"
          style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="mx-3 h-px bg-sidebar-border mb-2" />

      {/* Search conversations */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="h-8 pl-8 pr-7 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable area: conversations + rooms */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2 space-y-4">

          {/* ── Conversations ── */}
          {groups.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/50 text-center py-6">
              {search ? 'No conversations match' : 'No conversations yet'}
            </p>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2 py-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(conv => (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { onSelect(conv.id); onClose?.(); }}
                      onKeyDown={e => e.key === 'Enter' && (onSelect(conv.id), onClose?.())}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-all group/item cursor-pointer',
                        currentId === conv.id
                          ? 'bg-primary/20 text-sidebar-accent-foreground border border-primary/25'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border border-transparent'
                      )}
                    >
                      <MessageSquare className={cn('h-3.5 w-3.5 shrink-0', currentId === conv.id ? 'text-primary' : 'opacity-50')} />
                      <span className="flex-1 truncate text-[13px]">
                        {conv.title || 'New conversation'}
                      </span>
                      {currentId === conv.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/item:opacity-100 hover:bg-destructive/20 hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); onDelete(conv.id, e); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* ── Debate Rooms section ── */}
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={() => setRoomsExpanded(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
              >
                <Sword className="h-3 w-3" />
                Debate Rooms
                <ChevronDown className={cn('h-3 w-3 transition-transform', !roomsExpanded && '-rotate-90')} />
              </button>
              <button
                type="button"
                title="Browse all rooms"
                onClick={() => { navigate('/rooms'); onClose?.(); }}
                className="text-[10px] text-sidebar-foreground/40 hover:text-primary transition-colors"
              >
                All →
              </button>
            </div>

            {/* Room list */}
            {roomsExpanded && (
              <div className="space-y-0.5 mt-0.5">
                {rooms.length === 0 ? (
                  <div className="px-2 py-3 text-center">
                    <p className="text-[11px] text-sidebar-foreground/40 mb-2">No rooms joined yet</p>
                    <button
                      type="button"
                      onClick={() => { navigate('/rooms'); onClose?.(); }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Browse rooms →
                    </button>
                  </div>
                ) : (
                  rooms.map(room => (
                    <div
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { navigate(`/room/${room.id}`); onClose?.(); }}
                      onKeyDown={e => e.key === 'Enter' && (navigate(`/room/${room.id}`), onClose?.())}
                      className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground group/room"
                    >
                      <Sword className="h-3.5 w-3.5 shrink-0 opacity-60 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] truncate leading-snug">
                          {room.topic || room.name}
                        </p>
                        <p className="text-[11px] text-sidebar-foreground/50 flex items-center gap-1 mt-0.5">
                          <Users className="h-2.5 w-2.5" />
                          {room.participant_count ?? 0} participants
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {/* Create new room shortcut */}
                <button
                  type="button"
                  onClick={() => { navigate('/rooms/create'); onClose?.(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/40 hover:text-primary transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Create new room
                </button>
              </div>
            )}
          </div>

        </div>
      </ScrollArea>

      <div className="mx-3 h-px bg-sidebar-border mt-1" />

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        {/* ── Navigation sections ── */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 px-2 pb-1 pt-1">Core Features</p>

        {/* Group Chat highlight link */}
        <button
          type="button"
          onClick={() => { navigate('/group-chat'); onClose?.(); }}
          className="w-full flex items-center justify-between px-2 py-2 rounded-lg mb-1 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-400" />
            <span className="text-[13px] font-semibold text-sky-300">Group Chat</span>
          </div>
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-400/15 px-1.5 py-0.5 rounded-full">New</span>
        </button>

        {/* Pipeline Builder highlight link */}
        <button
          type="button"
          onClick={() => { navigate('/studio'); onClose?.(); }}
          className="w-full flex items-center justify-between px-2 py-2 rounded-lg mb-1 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-400" />
            <span className="text-[13px] font-semibold text-violet-300">Pipeline Builder</span>
          </div>
          <span className="text-[10px] text-violet-400 opacity-60">Studio →</span>
        </button>

        <div className="h-px bg-sidebar-border my-1" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 px-2 pb-1">Tools</p>

        {/* Template Library highlight link */}
        <button
          type="button"
          onClick={() => { navigate('/studio/templates'); onClose?.(); }}
          className="w-full flex items-center justify-between px-2 py-2 rounded-lg mb-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-amber-400" />
            <span className="text-[13px] font-semibold text-amber-300">Templates</span>
          </div>
          <span className="text-[10px] text-amber-400 opacity-60">Library →</span>
        </button>

        {[
          { icon: <Cpu className="h-4 w-4" />, label: 'My Personas', path: '/personas' },
          { icon: <Globe className="h-4 w-4" />, label: 'Persona Gallery', path: '/personas/gallery' },
          { icon: <TrendingUp className="h-4 w-4" />, label: 'Creator Dashboard', path: '/personas/dashboard' },
        ].map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => { navigate(item.path); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        <div className="h-px bg-sidebar-border my-1" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30 px-2 pb-1">Account</p>
        {[
          { icon: <Key className="h-4 w-4" />, label: 'Settings & History', path: '/settings' },
        ].map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => { navigate(item.path); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div className="h-px bg-sidebar-border my-1" />
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <a
          href="mailto:feedback@forge.ai?subject=Forge Beta Feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] text-sidebar-foreground/50 hover:text-primary transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Give Feedback
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MainChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const MAX_INPUT_CHARS = 4000;
  const [input, setInput] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Persona quick-select
  const [personas, setPersonas] = useState<import('@/types/types').Persona[]>([]);
  const [activePersona, setActivePersona] = useState<import('@/types/types').Persona | null>(null);
  const [personaPopoverOpen, setPersonaPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
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
  } = useSoloChat(conversationId || '');

  useEffect(() => { loadConversations(); loadPersonas(); }, []);

  const loadPersonas = async () => {
    try {
      const { personaService } = await import('@/services/persona.service');
      const data = await personaService.getPersonas();
      setPersonas(data);
    } catch { /* silent */ }
  };

  // Refresh sidebar title after auto-rename
  useEffect(() => {
    if (conversation?.title && conversation.title !== 'New conversation') {
      setConversations(prev =>
        prev.map(c => c.id === conversation.id ? { ...c, title: conversation.title } : c)
      );
    }
  }, [conversation?.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch { /* silent */ }
  };

  const handleNewChat = async () => {
    try {
      const c = await chatService.createConversation('gemini-2.5-flash');
      setConversations(prev => [c, ...prev]);
      navigate(`/chat/${c.id}`);
    } catch {
      toast.error('Failed to create conversation');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    if (!conversationId) {
      await handleNewChat();
      return;
    }
    const text = input.trim();
    setInput('');
    await sendMessage(text, undefined, activePersona?.system_prompt ?? undefined);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = async (prompt: string) => {
    if (!conversationId) {
      try {
        const c = await chatService.createConversation('gemini-2.5-flash');
        setConversations(prev => [c, ...prev]);
        navigate(`/chat/${c.id}`);
        // defer so navigation + hook settle
        setTimeout(() => sendMessage(prompt, undefined, activePersona?.system_prompt ?? undefined).then(loadConversations), 200);
      } catch { toast.error('Failed to start conversation'); }
      return;
    }
    await sendMessage(prompt, undefined, activePersona?.system_prompt ?? undefined);
    loadConversations();
  };

  const handleDelete = async (id: string) => {
    await chatService.deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) navigate('/');
    setDeleteTargetId(null);
    toast.success('Deleted');
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, []);

  const handleShare = async () => {
    try { await shareConversation(); }
    catch { toast.error('Failed to share'); }
  };

  const handleTitleSave = async () => {
    if (titleDraft.trim()) await renameConversation(titleDraft.trim());
    setEditingTitle(false);
  };

  const handleGenerateImage = async () => {
    if (!input.trim()) { toast.error('Describe the image first'); return; }
    const prompt = input.trim();
    setInput('');
    if (!conversationId) {
      const c = await chatService.createConversation('gemini-2.5-flash');
      setConversations(prev => [c, ...prev]);
      navigate(`/chat/${c.id}`);
      setTimeout(() => generateImage(prompt).then(loadConversations), 200);
      return;
    }
    await generateImage(prompt);
    loadConversations();
  };

  const currentModel = conversation ? AI_MODELS[conversation.model] : null;
  const isThinking = sending && (streamingContent === null || streamingContent === '');
  const isStreaming = sending && streamingContent !== null;

  // Build combined messages list (real + streaming placeholder)
  const allMessages = [
    ...messages,
    ...(isThinking || isStreaming
      ? [{
          id: '__streaming__',
          role: 'assistant' as const,
          content: streamingContent ?? '',
          isStreaming: true,
          created_at: new Date().toISOString(),
        }]
      : []),
  ];

  return (
    <TooltipProvider>
      {/* First-run onboarding wizard */}
      <OnboardingModal open={showOnboarding} onDismiss={dismissOnboarding} />
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* ── Desktop Sidebar ───────────────────────────────────────── */}
        <div
          className={cn(
            'hidden lg:flex flex-col border-r border-sidebar-border transition-all duration-200 shrink-0',
            sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          )}
        >
          <SidebarContent
            conversations={conversations}
            currentId={conversationId}
            onSelect={id => navigate(`/chat/${id}`)}
            onDelete={(id, e) => { e.stopPropagation(); setDeleteTargetId(id); }}
            onNew={handleNewChat}
            onSettings={() => navigate('/settings')}
          />
        </div>

        {/* ── Mobile Sidebar ─────────────────────────────────────────── */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar-background border-sidebar-border">
            <SidebarContent
              conversations={conversations}
              currentId={conversationId}
              onSelect={id => navigate(`/chat/${id}`)}
              onDelete={(id, e) => { e.stopPropagation(); setDeleteTargetId(id); }}
              onNew={handleNewChat}
              onSettings={() => navigate('/settings')}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ── Main Area ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="shrink-0 h-14 border-b flex items-center gap-2 px-3 bg-background">
            {/* Hamburger — mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Toggle — desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-9 w-9"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Model selector */}
            {conversation ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 gap-1.5 px-2.5 font-medium text-sm max-w-[240px]"
                  >
                    <span className="truncate">{currentModel?.name ?? conversation.model}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {Object.entries(MODELS_BY_PROVIDER).map(([provider, models]) => (
                    <div key={provider}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {provider}
                      </div>
                      {models.map(m => (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => switchModel(m.id as AIModel)}
                          className={cn(
                            'flex items-center justify-between gap-3 cursor-pointer',
                            conversation.model === m.id && 'bg-accent'
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(m.contextWindow / 1000).toFixed(0)}k ctx
                              {m.supportsVision ? ' · Vision' : ''}
                            </p>
                          </div>
                          {conversation.model === m.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex-1" />
            )}

            {/* Title (editable) */}
            {conversation && (
              <div className="flex-1 min-w-0 hidden md:flex items-center justify-center">
                {editingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleTitleSave();
                        if (e.key === 'Escape') setEditingTitle(false);
                      }}
                      className="text-sm font-medium bg-transparent border-b border-primary outline-none w-48 text-center"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTitleSave}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTitle(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground group/title"
                    onClick={() => { setTitleDraft(conversation.title || ''); setEditingTitle(true); }}
                  >
                    <span className="max-w-[200px] truncate">{conversation.title || 'New conversation'}</span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-60 transition-opacity" />
                  </button>
                )}
              </div>
            )}

            {/* Header actions */}
            <div className="ml-auto flex items-center gap-1">
              {conversation && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share conversation</TooltipContent>
                  </Tooltip>
                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Export
                      </div>
                      <DropdownMenuItem onClick={() => {
                        const md = messages.map(m =>
                          `**${m.role === 'user' ? 'You' : (activePersona?.name ?? 'Forge')}**\n\n${m.content}`
                        ).join('\n\n---\n\n');
                        const blob = new Blob([md], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `${conversation.title || 'conversation'}.md`; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Exported as Markdown');
                      }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Export as Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const txt = messages.map(m =>
                          `[${m.role === 'user' ? 'You' : (activePersona?.name ?? 'Forge')}]\n${m.content}`
                        ).join('\n\n');
                        const blob = new Blob([txt], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `${conversation.title || 'conversation'}.txt`; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Exported as text');
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Export as Text
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/')}>
                    <Bot className="h-4 w-4 mr-2 text-primary" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/group-chat')}>
                    <Users className="h-4 w-4 mr-2 text-sky-400" />
                    Group Chat
                    <span className="ml-auto text-[9px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded-full">NEW</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Key className="h-4 w-4 mr-2" />
                    API Keys
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {!conversationId ? (
                /* ── Welcome Hero ── */
                <div className="hero-mesh flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4 relative">

                  {/* Subtle grid overlay */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(hsl(var(--border)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.3) 1px, transparent 1px)',
                      backgroundSize: '48px 48px',
                      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)',
                    }}
                  />

                  {/* Animated glow orb */}
                  <div className="relative mb-8 animate-fade-up">
                    <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30 scale-150"
                      style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
                    <div className="relative h-24 w-24 rounded-3xl flex items-center justify-center shadow-[0_0_60px_hsl(var(--primary)/0.5)]"
                      style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
                      <Bot className="h-12 w-12 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="animate-fade-up-delay-1 mb-3">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-none">
                      Meet{' '}
                      <span className="gradient-text glow-title">Forge</span>
                    </h1>
                    <div className="mt-1">
                      <span className="badge-beta">Beta</span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md text-pretty leading-relaxed animate-fade-up-delay-2">
                    Build AI personas. Debate in real-time. Share them with the world.
                  </p>

                  {/* Feature cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-12 animate-fade-up-delay-2">
                    {[
                      {
                        icon: <Sparkles className="h-5 w-5" />,
                        title: 'Persona Builder',
                        desc: 'Craft AI personalities with sliders, tone & memory',
                        action: () => navigate('/personas'),
                        gradient: 'from-violet-500/10 to-purple-500/5',
                        iconColor: 'text-violet-400',
                        borderHover: 'hover:border-violet-500/50 hover:shadow-[0_0_24px_hsl(262_90%_66%/0.15)]',
                      },
                      {
                        icon: <Sword className="h-5 w-5" />,
                        title: 'Debate Rooms',
                        desc: 'Real-time debates with AI fact-check verdicts',
                        action: () => navigate('/rooms'),
                        gradient: 'from-orange-500/10 to-red-500/5',
                        iconColor: 'text-orange-400',
                        borderHover: 'hover:border-orange-500/50 hover:shadow-[0_0_24px_hsl(22_90%_50%/0.15)]',
                      },
                      {
                        icon: <Globe className="h-5 w-5" />,
                        title: 'Public Gallery',
                        desc: 'Browse & talk to community personas',
                        action: () => navigate('/personas/gallery'),
                        gradient: 'from-emerald-500/10 to-teal-500/5',
                        iconColor: 'text-emerald-400',
                        borderHover: 'hover:border-emerald-500/50 hover:shadow-[0_0_24px_hsl(152_68%_44%/0.15)]',
                      },
                    ].map(f => (
                      <button
                        key={f.title}
                        onClick={f.action}
                        className={cn(
                          'flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-gradient-to-br text-left transition-all duration-200 cursor-pointer group feature-card-glow',
                          f.gradient, f.borderHover
                        )}
                      >
                        <div className={cn('p-2 rounded-xl bg-card/80 border border-border/50', f.iconColor)}>
                          {f.icon}
                        </div>
                        <div>
                          <div className="font-bold text-sm mb-1 text-foreground">{f.title}</div>
                          <div className="text-xs text-muted-foreground text-pretty leading-relaxed">{f.desc}</div>
                        </div>
                        <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Explore →
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Prompt suggestions */}
                  <div className="w-full max-w-xl animate-fade-up-delay-3">
                    <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-widest font-semibold">
                      Or try a prompt
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PROMPT_SUGGESTIONS.map(s => (
                        <button
                          key={s.title}
                          onClick={() => handleSuggestion(s.prompt)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 text-left transition-all group"
                        >
                          <span className="text-lg shrink-0">{s.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground">{s.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{s.prompt}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex flex-col gap-6 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn('flex gap-3', i % 2 !== 0 && 'flex-row-reverse')}>
                      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                      <div className="flex flex-col gap-2 max-w-[60%]">
                        <div className="h-4 bg-muted rounded-full" style={{ width: `${60 + i * 15}%` }} />
                        {i % 2 === 0 && <div className="h-4 bg-muted rounded-full w-3/4" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 && !isThinking && !isStreaming ? (
                /* ── Empty conversation ── */
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <p className="text-muted-foreground text-sm mb-6">
                    Send a message to begin this conversation
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {PROMPT_SUGGESTIONS.slice(0, 4).map(s => (
                      <button
                        key={s.title}
                        onClick={() => handleSuggestion(s.prompt)}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-left transition-colors text-sm"
                      >
                        <span>{s.icon}</span>
                        <span className="font-medium text-xs truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Messages ── */
                <div className="flex flex-col gap-6">
                  {allMessages.map((msg, idx) => {
                    const isStreamingMsg = 'isStreaming' in msg && msg.isStreaming;
                    return (
                      <MessageBubble
                        key={msg.id}
                        role={msg.role as 'user' | 'assistant'}
                        content={msg.content}
                        imageUrl={'image_url' in msg ? msg.image_url : undefined}
                        isStreaming={isStreamingMsg}
                        onCopy={() => handleCopy(msg.content)}
                        onRetry={
                          !isStreamingMsg && msg.role === 'assistant' && idx === allMessages.length - 1
                            ? retryLastMessage
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
            <div className="max-w-3xl mx-auto">
              {/* Active persona indicator */}
              {activePersona && (
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <span className="text-sm">{activePersona.emoji_avatar ?? '🤖'}</span>
                  <span className="text-xs text-muted-foreground">
                    Persona: <span className="text-foreground font-semibold">{activePersona.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePersona(null)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-[0_2px_20px_hsl(var(--foreground)/0.06)] focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200"  >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder={activePersona ? `Message ${activePersona.name}…` : 'Message Forge…'}
                  disabled={sending}
                  rows={1}
                  className="flex-1 min-h-[36px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm leading-relaxed"
                />
                {input.length > MAX_INPUT_CHARS * 0.85 && (
                  <span className={`absolute bottom-1 right-14 text-[10px] ${input.length >= MAX_INPUT_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {input.length}/{MAX_INPUT_CHARS}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0 pb-0.5">
                  {/* Persona quick-select */}
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn('h-8 w-8', activePersona && 'text-primary')}
                          disabled={sending}
                          onClick={() => setPersonaPopoverOpen(v => !v)}
                        >
                          {activePersona ? (
                            <span className="text-base leading-none">{activePersona.emoji_avatar ?? '🤖'}</span>
                          ) : (
                            <Cpu className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Select persona</TooltipContent>
                    </Tooltip>
                    {personaPopoverOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <p className="text-xs font-semibold text-muted-foreground px-1">Select Persona</p>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {personas.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-muted-foreground mb-2">No personas yet</p>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setPersonaPopoverOpen(false); navigate('/personas/create'); }}>
                                Create one
                              </Button>
                            </div>
                          ) : (
                            <>
                              {activePersona && (
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground"
                                  onClick={() => { setActivePersona(null); setPersonaPopoverOpen(false); }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span className="text-xs">Remove persona</span>
                                </button>
                              )}
                              {personas.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                                    activePersona?.id === p.id && 'bg-primary/10'
                                  )}
                                  onClick={() => { setActivePersona(p); setPersonaPopoverOpen(false); }}
                                >
                                  <span className="text-base shrink-0">{p.emoji_avatar ?? '🤖'}</span>
                                  <div className="min-w-0">
                                    <div className="font-medium text-xs truncate">{p.name}</div>
                                    {p.description && <div className="text-[11px] text-muted-foreground truncate">{p.description}</div>}
                                  </div>
                                  {activePersona?.id === p.id && <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image generation */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={sending}
                        onClick={handleGenerateImage}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate image</TooltipContent>
                  </Tooltip>

                  {/* More options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={sending}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleGenerateImage}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Generate Image
                        <span className="ml-2 text-xs text-muted-foreground">Nano Banana</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Send / Stop */}
                  {sending ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          className="h-8 w-8"
                          onClick={stopGeneration}
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Stop generating</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!input.trim()}
                      onClick={() => handleSend()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground mt-2">
                Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send
                · <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The conversation and all its messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
