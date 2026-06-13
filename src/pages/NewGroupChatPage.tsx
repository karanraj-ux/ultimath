import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Group, GroupMessage, Verdict } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Users,
  Hash,
  Link2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Share2,
  Loader2,
  SendHorizonal,
  ShieldCheck,
  ExternalLink,
  Sword,
  Bot,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Types & Helpers ─────────────────────────────────────────────────────────

interface MessageWithVerdicts extends GroupMessage {
  verdicts: Verdict[];
  isFactChecking?: boolean;
}

function getSessionId(roomId: string): string {
  const key = `forge_room_${roomId}_session`;
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 10).toUpperCase();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getSenderName(roomId: string): string | null {
  return sessionStorage.getItem(`forge_room_${roomId}_name`);
}

function setSenderName(roomId: string, name: string) {
  sessionStorage.setItem(`forge_room_${roomId}_name`, name);
}

// ─── Verdict Status Badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-[hsl(152_68%_44%)] text-xs font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (status === 'disputed') {
    return (
      <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
        <XCircle className="h-3.5 w-3.5" /> Disputed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
      <HelpCircle className="h-3.5 w-3.5" /> Unverifiable
    </span>
  );
}

// ─── Verdict Card ─────────────────────────────────────────────────────────────

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const shareVerdict = () => {
    const text = `Forge Verdict: ${verdict.verdict_status.toUpperCase()}\n\n${verdict.verdict_text}\n\nSources: ${verdict.sources.map(s => s.url).join(', ')}`;
    navigator.clipboard.writeText(text);
    toast.success('Verdict copied!');
  };

  const borderColor =
    verdict.verdict_status === 'verified'    ? 'border-[hsl(152_68%_44%/0.4)]' :
    verdict.verdict_status === 'disputed'    ? 'border-destructive/40' :
                                               'border-warning/40';
  const bgColor =
    verdict.verdict_status === 'verified'    ? 'bg-[hsl(152_68%_44%/0.05)]' :
    verdict.verdict_status === 'disputed'    ? 'bg-destructive/5' :
                                               'bg-warning/5';

  return (
    <div className={cn('verdict-sealed mt-2 rounded-xl border-2 p-3 text-sm', borderColor, bgColor)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn(
            'h-4 w-4',
            verdict.verdict_status === 'verified'     ? 'text-[hsl(152_68%_44%)]' :
            verdict.verdict_status === 'disputed'     ? 'text-destructive' :
                                                        'text-warning',
          )} />
          <StatusBadge status={verdict.verdict_status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            <Lock className="h-2.5 w-2.5" /> SEALED
          </span>
          <button type="button" onClick={shareVerdict} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy verdict">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground/90 mb-2 text-pretty">{verdict.verdict_text}</p>

      {verdict.sources.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Sources</p>
          {verdict.sources.slice(0, 3).map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-primary hover:underline truncate">
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{s.title || s.url}</span>
            </a>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        Checked by {verdict.requested_by} · {format(new Date(verdict.created_at), 'MMM d, HH:mm')}
      </p>
    </div>
  );
}

// ─── Message Row ─────────────────────────────────────────────────────────────

function MessageRow({
  msg,
  mySessionId,
  onFactCheck,
}: {
  msg: MessageWithVerdicts;
  mySessionId: string;
  onFactCheck: (msg: GroupMessage) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isMine = msg.sender_session_id === mySessionId;
  const isAI = msg.is_ai || msg.sender_type === 'ai';

  return (
    <div
      className={cn('group flex gap-2.5 py-1', isMine && 'flex-row-reverse')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className={cn(
        'h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-semibold',
        isAI
          ? 'text-primary-foreground'
          : isMine
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-muted text-muted-foreground border border-border',
      )}
        style={isAI ? { background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' } : undefined}
      >
        {isAI ? <Bot className="h-3.5 w-3.5" /> : (msg.sender_name?.[0] ?? '?').toUpperCase()}
      </div>

      <div className={cn('flex flex-col gap-0.5 max-w-[75%]', isMine && 'items-end')}>
        {/* Sender + time + fact-check */}
        <div className={cn('flex items-center gap-1.5 text-[11px] text-muted-foreground', isMine && 'flex-row-reverse')}>
          <span className="font-medium text-foreground/80">{msg.sender_name}</span>
          <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
          {hovered && !isAI && (
            <button
              type="button"
              onClick={() => onFactCheck(msg)}
              disabled={msg.isFactChecking}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
              title="Fact-check this message"
            >
              {msg.isFactChecking
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <ShieldCheck className="h-3 w-3" />}
              {msg.isFactChecking ? 'Checking…' : 'Fact Check'}
            </button>
          )}
        </div>

        {/* Bubble */}
        {isAI ? (
          <div className="ai-moderator-bubble px-3 py-2.5 text-sm leading-relaxed bg-card/80">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">AI Moderator</span>
            </div>
            <p>{msg.content}</p>
          </div>
        ) : (
          <div className={cn(
            'px-3 py-2 rounded-2xl text-sm leading-relaxed',
            isMine
              ? 'text-primary-foreground rounded-tr-sm shadow-[0_4px_20px_hsl(var(--primary)/0.25)]'
              : 'bg-card border border-border rounded-tl-sm',
          )}
            style={isMine ? { background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))' } : undefined}
          >
            {msg.content}
          </div>
        )}

        {/* Verdicts */}
        {msg.verdicts.map(v => (
          <div key={v.id} className="w-full max-w-sm">
            <VerdictCard verdict={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Join Dialog ─────────────────────────────────────────────────────────────

function JoinDialog({ open, onJoin }: { open: boolean; onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-primary" />
            Join the Debate
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Enter a display name to join this room.</p>
        <div className="space-y-3 mt-1">
          <Input
            placeholder="Your display name…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onJoin(name.trim())}
            maxLength={40}
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onJoin('Anonymous')}>
              Stay Anonymous
            </Button>
            <Button className="flex-1" disabled={!name.trim()} onClick={() => onJoin(name.trim())}>
              Join Room
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewGroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const id = groupId ?? '';

  const [room, setRoom] = useState<Group | null>(null);
  const [messages, setMessages] = useState<MessageWithVerdicts[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [myName, setMyName] = useState<string>('');
  const [mySessionId] = useState(() => getSessionId(id));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input]);

  useEffect(() => {
    if (!id) return;
    const saved = getSenderName(id);
    if (saved) setMyName(saved);
    else setShowJoin(true);
    loadRoom();
    loadMessages();
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`room-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as GroupMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, verdicts: [] }];
          });
          if (newMsg.sender_session_id !== mySessionId) {
            toast(`${newMsg.sender_name}`, { description: newMsg.content.slice(0, 60) });
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'verdicts', filter: `group_id=eq.${id}` },
        (payload: { new: Record<string, unknown> }) => {
          const v = payload.new as unknown as Verdict;
          setMessages(prev => prev.map(m =>
            m.id === v.message_id
              ? { ...m, verdicts: [...m.verdicts.filter(x => x.id !== v.id), v], isFactChecking: false }
              : m
          ));
          toast.success('Fact-check complete!', { description: `Verdict: ${v.verdict_status.toUpperCase()}` });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, mySessionId]);

  const loadRoom = async () => {
    try {
      const { data, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
      if (error || !data) { toast.error('Room not found'); navigate('/rooms'); return; }
      setRoom(data as Group);
    } catch { toast.error('Failed to load room'); }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', id).order('created_at', { ascending: true });
      const { data: vs } = await supabase.from('verdicts').select('*').eq('group_id', id).order('created_at', { ascending: true });
      const verdictsByMsg: Record<string, Verdict[]> = {};
      for (const v of (vs ?? []) as Verdict[]) {
        if (!verdictsByMsg[v.message_id]) verdictsByMsg[v.message_id] = [];
        verdictsByMsg[v.message_id].push(v);
      }
      setMessages((msgs ?? []).map((m: GroupMessage) => ({ ...m, verdicts: verdictsByMsg[m.id] ?? [] })));
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const handleJoin = (name: string) => {
    const finalName = name === 'Anonymous' ? `Anonymous ${mySessionId.slice(-4)}` : name;
    setSenderName(id, finalName);
    setMyName(finalName);
    setShowJoin(false);
    toast(`Welcome, ${finalName}!`);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || !myName) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageWithVerdicts = {
      id: tempId, group_id: id, sender_name: myName, sender_type: 'user',
      content, sender_session_id: mySessionId,
      is_anonymous: myName.startsWith('Anonymous'), is_ai: false,
      verdicts: [], created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const { data: saved, error } = await supabase
        .from('group_messages')
        .insert({ group_id: id, sender_name: myName, sender_type: 'user', content, sender_session_id: mySessionId, is_anonymous: myName.startsWith('Anonymous'), is_ai: false })
        .select().single();
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...(saved as GroupMessage), verdicts: [] } : m));
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send', { description: err instanceof Error ? err.message : '' });
    } finally { setSending(false); }
  }, [input, sending, myName, id, mySessionId]);

  const handleFactCheck = useCallback(async (msg: GroupMessage) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isFactChecking: true } : m));
    toast('Fact-checking…', { description: 'AI is analysing this claim.' });
    try {
      const recentCtx = messages.filter(m => !m.is_ai).slice(-5).map(m => ({ sender_name: m.sender_name, content: m.content }));
      const { data, error } = await supabase.functions.invoke('fact-check', {
        body: { messageContent: msg.content, roomTopic: room?.topic ?? room?.name ?? '', context: recentCtx, messageId: msg.id, groupId: id, requestedBy: myName || 'Anonymous' },
      });
      if (error) { const errMsg = await error?.context?.text(); throw new Error(errMsg || error.message); }
      if (data?.verdict) {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, verdicts: [...m.verdicts, data.verdict], isFactChecking: false } : m
        ));
      }
    } catch (err: unknown) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isFactChecking: false } : m));
      toast.error('Fact-check failed', { description: err instanceof Error ? err.message.slice(0, 120) : '' });
    }
  }, [messages, room, id, myName]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyCode = () => { navigator.clipboard.writeText(room?.join_code ?? ''); toast.success('Join code copied!'); };
  const copyLink = () => { navigator.clipboard.writeText(window.location.href); toast.success('Invite link copied!'); };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Gradient Header ── */}
      <div className="shrink-0 relative overflow-hidden border-b border-border">
        {/* gradient bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.12) 0%, hsl(316 70% 58% / 0.06) 50%, transparent 100%)' }} />
        <div className="relative max-w-3xl mx-auto px-3 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
            <Sword className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate text-balance">
              {room?.topic ?? room?.name ?? 'Loading…'}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {room?.participant_count ?? 0}
              </span>
              <button type="button" onClick={copyCode}
                className="flex items-center gap-1 hover:text-foreground transition-colors font-mono">
                <Hash className="h-3 w-3" />
                {room?.join_code}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyLink} title="Copy invite link">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyLink} title="Share">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 scale-150"
                  style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
                <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-[0_0_24px_hsl(var(--primary)/0.4)]"
                  style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
                  <Sword className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="font-bold text-base mb-1">The debate begins</p>
              <p className="text-sm text-muted-foreground text-pretty max-w-xs">
                Send the first message. Hover any message to fact-check it with AI.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageRow key={msg.id} msg={msg} mySessionId={mySessionId} onFactCheck={handleFactCheck} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={myName ? `Message as ${myName}…` : 'Join the room to chat…'}
            disabled={sending || !myName}
            rows={1}
            className="flex-1 min-h-[36px] max-h-[140px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm leading-relaxed"
          />
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!input.trim() || sending || !myName}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Hover any message to <ShieldCheck className="h-3 w-3 inline" /> fact-check it
        </p>
      </div>

      <JoinDialog open={showJoin} onJoin={handleJoin} />
    </div>
  );
}

