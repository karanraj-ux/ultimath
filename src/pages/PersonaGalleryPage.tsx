import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Persona } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Search, MessageSquare, Sparkles,
  Filter, X,
} from 'lucide-react';

// ─── Domain filter pills ─────────────────────────────────────────────────────

const FILTER_DOMAINS = [
  'All', 'Technology', 'Science', 'Philosophy', 'History',
  'Finance', 'Health', 'Arts', 'Gaming', 'Law',
];

// ─── Tone badge colors ────────────────────────────────────────────────────────

const TONE_STYLE: Record<string, string> = {
  friendly:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  professional: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  blunt:        'bg-orange-500/10 text-orange-400 border-orange-500/25',
  playful:      'bg-pink-500/10 text-pink-400 border-pink-500/25',
  socratic:     'bg-violet-500/10 text-violet-400 border-violet-500/25',
};

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({ persona, onTalk }: { persona: Persona; onTalk: () => void }) {
  const toneStyle = TONE_STYLE[persona.tone ?? 'friendly'] ?? TONE_STYLE.friendly;
  const domains = persona.knowledge_domain
    ? persona.knowledge_domain.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl overflow-hidden forge-card-hover h-full flex flex-col"
      onClick={onTalk}
    >
      {/* Hover top gradient bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary to-[hsl(316_70%_52%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" />

      <div className="p-5 flex-1 flex flex-col">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shrink-0 border border-primary/20 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] transition-all duration-200">
            {persona.emoji_avatar ?? '🤖'}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-bold truncate leading-snug">{persona.name}</h3>
            {persona.tone && (
              <span className={cn('inline-flex items-center mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', toneStyle)}>
                {persona.tone}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {persona.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 text-pretty leading-relaxed flex-1">
            {persona.description}
          </p>
        )}

        {/* Domains */}
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {domains.map(d => (
              <span key={d} className="forge-tag forge-tag-violet text-[10px]">{d}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {persona.memory_enabled && (
              <span className="forge-tag forge-tag-green text-[10px]">Memory</span>
            )}
          </div>
          {/* CTA — always visible on mobile, hover-reveal on desktop */}
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 md:translate-y-1 md:group-hover:translate-y-0"
            onClick={e => { e.stopPropagation(); onTalk(); }}
          >
            <MessageSquare className="h-3 w-3" />
            Chat Now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function PersonaSkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="flex-1 pt-0.5 space-y-2">
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/3 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-muted animate-pulse rounded" />
        <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex gap-1 mt-auto">
        <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
        <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonaGalleryPage() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');

  useEffect(() => { loadPersonas(); }, []);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPersonas(Array.isArray(data) ? data as Persona[] : []);
    } catch {
      toast.error('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  // Track view when user clicks Talk
  const trackView = async (personaId: string) => {
    await supabase.from('persona_stats').insert({
      persona_id: personaId,
      event_type: 'view',
      session_id: sessionStorage.getItem(`forge_session`) ?? Math.random().toString(36).slice(2),
    });
  };

  const handleTalk = async (persona: Persona) => {
    await trackView(persona.id);
    navigate(`/p/${persona.id}`);
  };

  const filtered = personas.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || p.name.toLowerCase().includes(q)
      || (p.description ?? '').toLowerCase().includes(q)
      || (p.knowledge_domain ?? '').toLowerCase().includes(q);
    const matchesDomain = domainFilter === 'All'
      || (p.knowledge_domain ?? '').toLowerCase().includes(domainFilter.toLowerCase());
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/personas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg shrink-0">🌐</span>
            <h1 className="font-bold truncate">Persona Gallery</h1>
          </div>
          <Button size="sm" onClick={() => navigate('/personas/create')} className="shrink-0">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </div>
      </div>

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(152 68% 44% / 0.08) 0%, hsl(262 90% 66% / 0.06) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.2) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-3xl font-bold tracking-tight text-balance">Community Personas</h2>
              <span className="badge-beta">Beta</span>
            </div>
            <p className="text-sm text-muted-foreground text-pretty max-w-lg leading-relaxed">
              AI agents crafted by the community. Click <strong className="text-foreground">Chat Now</strong> to start a conversation — no account needed.
            </p>
          </div>
          {!loading && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-xs font-semibold text-primary">
                {personas.length} persona{personas.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search personas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!loading && (
            <span className="text-xs text-muted-foreground shrink-0">
              {filtered.length} persona{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Domain / tone filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {FILTER_DOMAINS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDomainFilter(d)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 shrink-0',
                domainFilter === d
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)]'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Bento card grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <PersonaSkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-5">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
                style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.15), hsl(316 70% 58% / 0.1))' }}
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="font-bold text-lg mb-1">
              {search || domainFilter !== 'All' ? 'No personas match' : 'No public personas yet'}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs text-pretty leading-relaxed">
              {search || domainFilter !== 'All'
                ? 'Try different keywords or clear your filters to see all personas.'
                : 'Be the first to craft and publish a persona to the community gallery.'}
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {(search || domainFilter !== 'All') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(''); setDomainFilter('All'); }}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear filters
                </Button>
              )}
              <Button size="sm" onClick={() => navigate('/personas/create')}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Create Persona
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
            {filtered.map(p => (
              <PersonaCard key={p.id} persona={p} onTalk={() => handleTalk(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}