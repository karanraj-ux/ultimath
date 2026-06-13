import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { personaService } from '@/services/persona.service';
import type { Persona } from '@/types/types';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  Link2,
  ArrowLeft,
  Bot,
  Globe,
  Lock,
  Sparkles,
  Brain,
  MessageSquare,
  Users,
  Search,
  Eye,
  ChevronRight,
  Zap,
  X,
  QrCode,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { supabase } from '@/db/supabase';

const TONE_LABELS: Record<string, string> = {
  friendly: 'Friendly',
  professional: 'Professional',
  blunt: 'Blunt',
  playful: 'Playful',
  socratic: 'Socratic',
};

const TONE_COLORS: Record<string, string> = {
  friendly: 'bg-success/15 text-success border-success/20',
  professional: 'bg-primary/15 text-primary border-primary/20',
  blunt: 'bg-destructive/15 text-destructive border-destructive/20',
  playful: 'bg-warning/15 text-warning border-warning/20',
  socratic: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
};

const TONE_FILTERS = ['All', 'Friendly', 'Professional', 'Blunt', 'Playful', 'Socratic'] as const;

export default function PersonaListPage() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [previewPersona, setPreviewPersona] = useState<Persona | null>(null);
  const [shareToolPersona, setShareToolPersona] = useState<Persona | null>(null);
  const [shareToolUrl, setShareToolUrl] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [toneFilter, setToneFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await personaService.getPersonas();
      setPersonas(data);
    } catch {
      toast.error('Failed to load personas');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await personaService.deletePersona(id);
      setPersonas(prev => prev.filter(p => p.id !== id));
      toast.success('Persona deleted');
    } catch {
      toast.error('Failed to delete persona');
    } finally {
      setDeleteId(null);
    }
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/p/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      toast.success('Share link copied');
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleAddToGroupChat(persona: Persona) {
    // Navigate to group chat with persona pre-selected via query param
    navigate(`/group-chat?persona=${persona.id}&name=${encodeURIComponent(persona.name)}`);
    toast.success(`${persona.name} added — starting Group Chat`);
  }

  async function handleShareTool(persona: Persona) {
    setShareToolPersona(persona);
    setGeneratingShare(true);
    setShareToolUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to share a tool');
        return;
      }

      // Check if a shared tool already exists
      const { data: existing } = await supabase
        .from('shared_tools')
        .select('share_token')
        .eq('persona_id', persona.id)
        .eq('creator_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        setShareToolUrl(`${window.location.origin}/tool/${existing.share_token}`);
      } else {
        // Create new shared tool
        const shareToken = `t_${Math.random().toString(36).substring(2, 9)}${Math.random().toString(36).substring(2, 9)}`;
        const { data: inserted, error } = await supabase
          .from('shared_tools')
          .insert({
            creator_id: session.user.id,
            persona_id: persona.id,
            share_token: shareToken
          })
          .select('share_token')
          .single();

        if (error) throw error;
        setShareToolUrl(`${window.location.origin}/tool/${inserted.share_token}`);
      }
    } catch (err: any) {
      toast.error('Failed to generate share link: ' + err.message);
    } finally {
      setGeneratingShare(false);
    }
  }

  const filtered = personas.filter(p => {
    const matchTone = toneFilter === 'All' || (p.tone ?? 'friendly').toLowerCase() === toneFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.knowledge_domain ?? '').toLowerCase().includes(q);
    return matchTone && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧬</span>
              <span className="font-bold text-sm">Personas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 hidden md:flex" onClick={() => navigate('/personas/gallery')}>
              <Globe className="h-3.5 w-3.5" />
              Gallery
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 hidden md:flex" onClick={() => navigate('/personas/dashboard')}>
              <Brain className="h-3.5 w-3.5" />
              Dashboard
            </Button>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => navigate('/personas/create')}>
              <Plus className="h-3.5 w-3.5" />
              New Persona
            </Button>
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight text-balance mb-2">Your Personas</h1>
          <p className="text-sm text-muted-foreground text-pretty max-w-lg">
            Build AI personalities with unique tones, knowledge domains, and memory. Share via link — visitors need no account.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

        {/* Search + tone filter bar */}
        {!loading && personas.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search personas…"
                className="pl-8 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
              {TONE_FILTERS.map(tone => (
                <button
                  key={tone}
                  onClick={() => setToneFilter(tone)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                    toneFilter === tone
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                  )}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-xl shimmer" />
            ))}
          </div>
        ) : personas.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No personas yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-pretty">
              Build your first AI persona — give it a personality, tone, and knowledge domain. Then share it with anyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => navigate('/personas/create')} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first persona
              </Button>
              <Button variant="outline" onClick={() => navigate('/personas/gallery')} className="gap-2">
                <Globe className="h-4 w-4" />
                Browse Gallery
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No personas match your filters.</p>
            <button onClick={() => { setToneFilter('All'); setSearchQuery(''); }} className="mt-2 text-xs text-primary hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(persona => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                copied={copied === persona.id}
                onCopyLink={() => copyLink(persona.id)}
                onEdit={() => navigate(`/personas/edit/${persona.id}`)}
                onDelete={() => setDeleteId(persona.id)}
                onChat={() => navigate(`/p/${persona.id}`)}
                onPreview={() => setPreviewPersona(persona)}
                onAddToGroupChat={() => handleAddToGroupChat(persona)}
                onShareTool={() => handleShareTool(persona)}
              />
            ))}
            {/* Create new tile */}
            <button
              onClick={() => navigate('/personas/create')}
              className="h-full min-h-[192px] rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Persona</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewPersona} onOpenChange={open => !open && setPreviewPersona(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg p-0 overflow-hidden">
          {previewPersona && (
            <>
              {/* Modal hero */}
              <div className="relative px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-primary/8 via-transparent to-transparent">
                <DialogHeader className="mb-0">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl shrink-0">
                      {previewPersona.emoji_avatar ?? '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-bold mb-1 text-balance">
                        {previewPersona.name}
                      </DialogTitle>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5 border', TONE_COLORS[previewPersona.tone ?? 'friendly'])}
                        >
                          {TONE_LABELS[previewPersona.tone ?? 'friendly']}
                        </Badge>
                        {previewPersona.is_public ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 text-success border-success/30 bg-success/10">
                            <Globe className="h-2.5 w-2.5" />Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" />Private
                          </Badge>
                        )}
                        {previewPersona.memory_enabled && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1">
                            <Brain className="h-2.5 w-2.5" />Memory
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <ScrollArea className="max-h-[50vh]">
                <div className="px-6 py-4 space-y-4">
                  {/* Description */}
                  {previewPersona.description && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">About</p>
                      <p className="text-sm text-foreground/80 text-pretty">{previewPersona.description}</p>
                    </div>
                  )}

                  {/* Knowledge domain */}
                  {previewPersona.knowledge_domain && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Knowledge Domains</p>
                      <div className="flex flex-wrap gap-1.5">
                        {previewPersona.knowledge_domain.split(',').map((d, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-xs text-foreground/70 border border-border">
                            {d.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System prompt preview */}
                  {previewPersona.system_prompt && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">System Prompt</p>
                      <div className="rounded-lg bg-muted/60 border border-border p-3">
                        <p className="text-xs text-foreground/70 font-mono leading-relaxed line-clamp-5">
                          {previewPersona.system_prompt}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* CTA footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 gap-2 h-10"
                  onClick={() => { navigate(`/p/${previewPersona.id}`); setPreviewPersona(null); }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Start Chat
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-10 border-sky-500/30 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
                  onClick={() => { handleAddToGroupChat(previewPersona); setPreviewPersona(null); }}
                >
                  <Users className="h-4 w-4" />
                  Add to Group Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 hidden sm:flex"
                  onClick={() => { navigate(`/personas/edit/${previewPersona.id}`); setPreviewPersona(null); }}
                  title="Edit persona"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this persona?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Anyone with the share link will no longer be able to access it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Tool Dialog */}
      <Dialog open={!!shareToolPersona} onOpenChange={open => !open && setShareToolPersona(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Share as Public Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Share a distraction-free version of <strong className="text-foreground">{shareToolPersona?.name}</strong>.
              Consumers don't need an account or API key — usage draws from your credit pool.
            </p>

            {generatingShare ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 border border-border border-dashed rounded-xl bg-muted/20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Generating secure link...</p>
              </div>
            ) : shareToolUrl ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeDataUrl text={shareToolUrl} width={180} />
                </div>
                
                <div className="w-full flex items-center gap-2 mt-2">
                  <Input readOnly value={shareToolUrl} className="text-xs text-muted-foreground h-9" />
                  <Button 
                    size="icon" 
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(shareToolUrl);
                      toast.success('Link copied');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    onClick={() => window.open(shareToolUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Persona Card ───────────────────────────────────────────────────── */
interface PersonaCardProps {
  persona: Persona;
  copied: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChat: () => void;
  onPreview: () => void;
  onAddToGroupChat: () => void;
  onShareTool: () => void;
}

function PersonaCard({ persona, copied, onCopyLink, onEdit, onDelete, onChat, onPreview, onAddToGroupChat, onShareTool }: PersonaCardProps) {
  const tone = persona.tone ?? 'friendly';
  const avatar = persona.emoji_avatar ?? '🤖';

  return (
    <div className="h-full flex flex-col rounded-2xl border border-border bg-card forge-card-hover overflow-hidden group gradient-line-top">
      {/* Card top */}
      <div className="p-5 flex items-start gap-3 flex-1 cursor-pointer" onClick={onPreview} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onPreview()}>
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl shrink-0 group-hover:border-primary/40 transition-colors">
          {avatar}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-sm truncate">{persona.name}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {persona.is_public ? (
                <Globe className="h-3 w-3 text-success" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
          </div>

          {persona.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 text-pretty mb-2.5">
              {persona.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 h-5 border', TONE_COLORS[tone])}
            >
              {TONE_LABELS[tone]}
            </Badge>
            {persona.memory_enabled && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border gap-0.5">
                <Brain className="h-2.5 w-2.5" />
                Memory
              </Badge>
            )}
            {persona.knowledge_domain && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border truncate max-w-[100px]">
                {persona.knowledge_domain.split(',')[0].trim()}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick peek button — shows on hover */}
      <div className="px-5 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={onPreview}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground py-1 border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all"
        >
          <Eye className="h-3 w-3" />
          Preview details
          <ChevronRight className="h-3 w-3 ml-auto" />
        </button>
      </div>

      {/* Card actions */}
      <div className="border-t border-border px-3 py-2.5 flex items-center gap-1">
        <Button variant="default" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={onChat}>
          <MessageSquare className="h-3 w-3" />
          Chat
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          onClick={onShareTool}
          title="Share as Public Tool"
        >
          <QrCode className="h-3 w-3" />
          <span className="hidden md:inline">Tool</span>
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
          onClick={onAddToGroupChat}
          title="Add to Group Chat"
        >
          <Users className="h-3 w-3" />
          <span className="hidden md:inline">Group</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopyLink} title="Copy share link">
          {copied ? <span className="text-[10px] text-success font-medium">✓</span> : <Link2 className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

