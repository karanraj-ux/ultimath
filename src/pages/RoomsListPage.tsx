import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Group } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Hash, Users, ArrowRight, Lock, Globe, Link2, Sword, Search, Bot, Zap, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A room is "active" if it was created within the last 10 minutes */
function isActive(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 10 * 60 * 1000;
}

function RoomTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    public:         { label: 'Public',       icon: <Globe  className="h-3 w-3" />, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    'semi-private': { label: 'Semi-private', icon: <Link2  className="h-3 w-3" />, cls: 'bg-amber-500/15  text-amber-400  border-amber-500/30'  },
    private:        { label: 'Private',      icon: <Lock   className="h-3 w-3" />, cls: 'bg-rose-500/15   text-rose-400   border-rose-500/30'   },
  };
  const config = map[type] ?? map.public;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', config.cls)}>
      {config.icon}{config.label}
    </span>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({ room, onEnter }: { room: Group; onEnter: () => void }) {
  const active = isActive(room.created_at ?? '');

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.join_code);
    toast.success('Join code copied!');
  };

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl overflow-hidden forge-card-hover h-full flex flex-col"
      onClick={onEnter}
    >
      {/* Hover gradient bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary to-[hsl(316_70%_52%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" />

      <div className="p-5 flex-1 flex flex-col">
        {/* Top row: icon + badges */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
              <Sword className="h-5 w-5 text-primary" />
            </div>
            {/* Live activity dot */}
            {active && (
              <div className="flex items-center gap-1">
                <span className="activity-dot" />
                <span className="text-[10px] text-[hsl(152_68%_44%)] font-semibold">Live</span>
              </div>
            )}
          </div>
          <RoomTypeBadge type={room.room_type ?? 'public'} />
        </div>

        {/* Topic */}
        <h3 className="font-bold text-sm mb-1.5 line-clamp-2 text-balance flex-1">
          {room.topic || room.name}
        </h3>
        {room.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 text-pretty leading-relaxed">
            {room.description}
          </p>
        )}

        {/* Chips row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Participant count */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="font-semibold text-foreground">{room.participant_count ?? 0}</span>
          </span>
          {/* Join code */}
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border border-border bg-muted text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            title="Click to copy code"
          >
            <Hash className="h-3 w-3" />
            {room.join_code}
          </button>
          {/* AI persona chip (if set) */}
          {(room as Group & { ai_persona_name?: string }).ai_persona_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-primary/25 bg-primary/8 text-primary">
              <Bot className="h-3 w-3" />
              {(room as Group & { ai_persona_name?: string }).ai_persona_name}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {new Date(room.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Join Room
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Join by Code Dialog ─────────────────────────────────────────────────────

function JoinByCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('join_code', trimmed)
        .maybeSingle();
      if (error || !data) {
        toast.error('Invalid room code', { description: 'No room found with that code.' });
        return;
      }
      onOpenChange(false);
      navigate(`/room/${data.id}`);
    } catch {
      toast.error('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a Room</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Enter the 6-character room code to join.</p>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="ABC123"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            className="font-mono tracking-widest uppercase text-center"
            maxLength={8}
          />
          <Button onClick={handleJoin} disabled={loading || !code.trim()}>
            Join
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RoomsListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rooms.filter(r => {
    const q = search.toLowerCase();
    return !q || (r.topic ?? r.name).toLowerCase().includes(q) || r.join_code.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">⚔️</span>
            <h1 className="font-bold text-lg truncate">Debate Rooms</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)} className="h-8">
              <Hash className="h-3.5 w-3.5 mr-1.5" />
              Join by Code
            </Button>
            <Button size="sm" onClick={() => navigate('/rooms/create')} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Room
            </Button>
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(22 90% 50% / 0.08) 0%, hsl(316 70% 58% / 0.06) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.2) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold tracking-tight text-balance mb-2">Live Debate Arenas</h2>
            <p className="text-sm text-muted-foreground text-pretty max-w-lg leading-relaxed">
              Join real-time debates. AI fact-checkers deliver immutable verdicts with cited sources. No account needed.
            </p>
          </div>
          <Button
            onClick={() => navigate('/rooms/create')}
            className="shrink-0 gap-2 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]"
          >
            <Sword className="h-4 w-4" />
            Start a Debate
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            /* ── No search results ── */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
                style={{ background: 'linear-gradient(135deg, hsl(22 90% 50% / 0.15), hsl(316 70% 58% / 0.1))' }}
              >
                <Search className="h-8 w-8 text-primary" />
              </div>
              <p className="font-bold text-lg mb-1">No rooms match "{search}"</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs text-pretty">
                Try a different keyword or clear the search to see all rooms.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>Clear search</Button>
            </div>
          ) : (
            /* ── Zero rooms — feature introduction ── */
            <div className="flex flex-col items-center py-12 text-center max-w-2xl mx-auto">
              {/* Icon */}
              <div
                className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_hsl(var(--primary)/0.25)]"
                style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.2), hsl(316 70% 58% / 0.15))' }}
              >
                <Sword className="h-10 w-10 text-primary" />
              </div>

              <p className="font-bold text-2xl mb-2 text-balance">No live rooms yet — be the first</p>
              <p className="text-sm text-muted-foreground mb-8 max-w-md text-pretty leading-relaxed">
                Live Rooms are real-time debate arenas where <strong>multiple people</strong> argue a topic together
                — with an AI fact-checker delivering instant verdicts. Share a room link or 6-digit join code
                with anyone. No account needed to join.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {[
                  { icon: <Users className="h-3.5 w-3.5" />, text: 'Multi-person debates' },
                  { icon: <Bot className="h-3.5 w-3.5" />, text: 'AI fact-checking' },
                  { icon: <Zap className="h-3.5 w-3.5" />, text: 'Real-time streaming' },
                  { icon: <MessageSquare className="h-3.5 w-3.5" />, text: 'Share via link or code' },
                ].map(f => (
                  <span key={f.text}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground"
                  >
                    {f.icon}{f.text}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/rooms/create')} className="gap-2 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]">
                  <Plus className="h-4 w-4" />
                  Start the First Room
                </Button>
                <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
                  <Hash className="h-4 w-4" />
                  Join by Code
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
            {filtered.map(room => (
              <RoomCard key={room.id} room={room} onEnter={() => navigate(`/room/${room.id}`)} />
            ))}
          </div>
        )}
      </div>

      <JoinByCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
