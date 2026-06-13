import { useState, useMemo, useEffect, useCallback, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/ui/star-rating';
import { TemplateImportModal } from '@/components/ui/template-import-modal';
import { toast } from 'sonner';
import {
  Search, Layers, Sparkles, Loader2, GitFork, ChevronRight,
  ArrowLeft, X, LayoutTemplate, Upload, Download, Pencil, Trash2,
  ChevronDown, SortAsc, User, Package, Link2,
} from 'lucide-react';
import { PIPELINE_TEMPLATES, type PipelineTemplate, type TemplateCategory } from '@/data/pipelineTemplates';
import { pipelineService } from '@/services/pipeline.service';
import { templateShareService } from '@/services/template-share.service';
import { useTemplateRatings } from '@/hooks/use-template-ratings';
import { useUserFingerprint } from '@/hooks/use-user-fingerprint';
import { supabase } from '@/db/supabase';
import { exportBuiltinTemplate, exportUserTemplate } from '@/lib/export-template';
import type { AgentPipeline } from '@/types/types';
import { cn } from '@/lib/utils';

// ── Types & constants ─────────────────────────────────────────────────────────

type TabId = 'My Templates' | 'All' | TemplateCategory;
type SortId = 'newest' | 'top-rated' | 'most-used';

const TABS: { id: TabId; label: string }[] = [
  { id: 'My Templates', label: 'My Templates' },
  { id: 'All',          label: 'All' },
  { id: 'Research',     label: 'Research' },
  { id: 'Writing',      label: 'Writing' },
  { id: 'Debate',       label: 'Debate' },
  { id: 'Code',         label: 'Code' },
  { id: 'Other',        label: 'Other' },
];

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'newest',    label: 'Newest' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'most-used', label: 'Most Used' },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  Research: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Writing:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Debate:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Code:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Other:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Unified template item ──────────────────────────────────────────────────────

type TemplateSource = 'builtin' | 'user';

interface TemplateItem {
  id: string;                  // slug for builtin, uuid for user
  source: TemplateSource;
  name: string;
  emoji: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  steps: PipelineTemplate['steps'];
  createdAt: string;
  cloneCount: number;
  pipeline?: AgentPipeline;    // only for user templates
  isImported?: boolean;
}

// ── Rating row – each card has its own ratings hook ───────────────────────────

function RatingRow({
  templateId,
  templateType,
  interactive,
}: {
  templateId: string;
  templateType: TemplateSource;
  interactive?: boolean;
}) {
  const { stats, submitting, submitRating } = useTemplateRatings({
    templateId,
    templateType,
  });
  return (
    <StarRating
      average={stats.average}
      count={stats.count}
      userRating={stats.userRating}
      interactive={interactive}
      onRate={submitRating}
      submitting={submitting}
      size="sm"
    />
  );
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({ step, index, total }: { step: PipelineTemplate['steps'][0]; index: number; total: number }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
          {index + 1}
        </div>
        {index < total - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />}
      </div>
      <div className="flex-1 min-w-0 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm leading-none">{step.persona_emoji}</span>
          <span className="font-semibold text-sm">{step.persona_name}</span>
          {step.role && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
              {step.role}
            </span>
          )}
        </div>
        {step.instruction && (
          <p className="text-xs text-muted-foreground mt-1.5 text-pretty leading-relaxed line-clamp-2">
            {step.instruction}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  item,
  open,
  onClose,
  onClone,
  onShare,
  cloning,
  sharing,
}: {
  item: TemplateItem | null;
  open: boolean;
  onClose: () => void;
  onClone: (item: TemplateItem) => void;
  onShare: (item: TemplateItem) => void;
  cloning: boolean;
  sharing: boolean;
}) {
  if (!item) return null;
  const borderColor = item.source === 'user' ? 'border-violet-500/20' : 'border-amber-500/20';
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className={cn('max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto bg-card border', borderColor)}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-balance">{item.name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.steps.length} sequential agent{item.steps.length !== 1 ? 's' : ''}
                {item.source === 'user' && <span className="ml-1.5 text-violet-400">· My Template</span>}
              </p>
            </div>
          </div>
        </DialogHeader>

        {item.description && (
          <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{item.description}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', CATEGORY_COLORS[item.category])}>
            {item.category}
          </span>
          {item.tags.map(tag => (
            <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {item.isImported && (
            <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              Imported
            </span>
          )}
        </div>

        {/* Rating (interactive in modal) */}
        <div className="flex items-center gap-3 py-1">
          <RatingRow templateId={item.id} templateType={item.source} interactive />
          <span className="text-[10px] text-muted-foreground/50">Click stars to rate</span>
          <span className="flex-1" />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <GitFork className="h-3 w-3" />{item.cloneCount} use{item.cloneCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Steps */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline Steps</p>
          <div>
            {item.steps.map((step, i) => (
              <StepRow key={i} step={step} index={i} total={item.steps.length} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 pl-3">
            <ChevronRight className="h-3.5 w-3.5 text-primary" />Final output
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" className="h-9" onClick={onClose}>
            <X className="h-4 w-4 mr-1.5" />Close
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-9 gap-1.5 text-primary border border-primary/25 hover:bg-primary/10"
            onClick={() => onShare(item)}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Share
          </Button>
          <Button
            className={cn(
              'h-9 flex-1 gap-2 font-semibold',
              item.source === 'user'
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-black',
            )}
            onClick={() => onClone(item)}
            disabled={cloning}
          >
            {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitFork className="h-4 w-4" />}
            Clone to My Studio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  item,
  onUse,
  onPreview,
  onExport,
  onShare,
  onEdit,
  onDelete,
  cloning,
  sharing,
}: {
  item: TemplateItem;
  onUse: () => void;
  onPreview: () => void;
  onExport: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  cloning: boolean;
  sharing: boolean;
}) {
  const isUser = item.source === 'user';
  const border  = isUser
    ? 'border-violet-500/15 hover:border-violet-500/35 bg-violet-500/5 hover:bg-violet-500/8'
    : 'border-amber-500/15 hover:border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10';
  const nameColor   = isUser ? 'text-violet-200' : 'text-amber-200';
  const pillColor   = isUser
    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  const ctaClass    = isUser
    ? 'bg-violet-600 hover:bg-violet-500 text-white'
    : 'bg-amber-500 hover:bg-amber-400 text-black';
  const previewCls  = isUser
    ? 'border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300'
    : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300';

  return (
    <div className={cn('group h-full flex flex-col rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 p-5', border)}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none shrink-0 mt-0.5">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={cn('font-bold text-sm text-balance', nameColor)}>{item.name}</h3>
            {item.isImported && (
              <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Imported
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-pretty leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>

      {/* Agent pills */}
      <div className="flex flex-wrap gap-1.5 mb-3 flex-1">
        {item.steps.map((s, i) => (
          <span key={i} className={cn('inline-flex items-center gap-1 text-[10px] border px-2 py-0.5 rounded-full', pillColor)}>
            {s.persona_emoji} {s.persona_name}
          </span>
        ))}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', CATEGORY_COLORS[item.category])}>
          {item.category}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {item.steps.length} agent{item.steps.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50 ml-auto">
          <GitFork className="h-3 w-3" />{item.cloneCount}
        </span>
      </div>

      {/* Rating */}
      <div className="mb-4">
        <RatingRow templateId={item.id} templateType={item.source} interactive />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-auto">
        {/* Export */}
        <button
          type="button"
          onClick={onExport}
          title="Export as JSON"
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          title="Copy share link"
          disabled={sharing}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-primary/25 text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors shrink-0 disabled:opacity-50"
        >
          {sharing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Link2 className="h-3.5 w-3.5" />}
        </button>

        {/* Edit (user only) */}
        {isUser && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            title="Edit pipeline"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-violet-500/20 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Delete (user only) */}
        {isUser && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete template"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-destructive/20 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 text-xs gap-1 flex-1 border', previewCls)}
          onClick={onPreview}
        >
          <Search className="h-3 w-3" />Preview
        </Button>
        <Button
          size="sm"
          className={cn('h-8 text-xs gap-1 flex-1 font-semibold', ctaClass)}
          onClick={onUse}
          disabled={cloning}
        >
          {cloning ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitFork className="h-3 w-3" />}
          Use
        </Button>
      </div>
    </div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 bg-muted" />
          <Skeleton className="h-3 w-full bg-muted" />
          <Skeleton className="h-3 w-2/3 bg-muted" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full bg-muted" />
        <Skeleton className="h-5 w-16 rounded-full bg-muted" />
        <Skeleton className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="flex gap-2 mt-auto pt-2">
        <Skeleton className="h-8 flex-1 rounded-lg bg-muted" />
        <Skeleton className="h-8 flex-1 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TemplateLibraryPage
// ══════════════════════════════════════════════════════════════════════════════

export default function TemplateLibraryPage() {
  const navigate = useNavigate();
  const fingerprint = useUserFingerprint();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]                   = useState<TabId>('All');
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState<SortId>('newest');
  const [preview, setPreview]           = useState<TemplateItem | null>(null);
  const [cloningId, setCloningId]       = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<AgentPipeline[]>([]);
  const [loadingUser, setLoadingUser]   = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AgentPipeline | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [importOpen, setImportOpen]     = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const [sharingId, setSharingId]       = useState<string | null>(null);
  // Clone counts for builtin templates, keyed by template slug
  const [builtinCloneCounts, setBuiltinCloneCounts] = useState<Record<string, number>>({});

  // ── Rating stats cache (keyed by templateId) ───────────────────────────────
  // We don't need a global cache because each card/row uses its own hook.
  // This is fine at our template scale (<50 items).

  // ── Load user templates from DB ────────────────────────────────────────────
  const loadUserTemplates = useCallback(async () => {
    setLoadingUser(true);
    try {
      const data = await pipelineService.getTemplates();
      setUserTemplates(data);
    } catch {
      toast.error('Failed to load your templates');
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => { loadUserTemplates(); }, [loadUserTemplates]);

  // ── Load builtin clone counts from template_usage ─────────────────────────
  useEffect(() => {
    supabase
      .from('template_usage')
      .select('template_id, clone_count')
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data as { template_id: string; clone_count: number }[]) {
          counts[row.template_id] = row.clone_count ?? 0;
        }
        setBuiltinCloneCounts(counts);
      });
  }, []);

  // ── Normalise builtin templates into TemplateItem ─────────────────────────
  const builtinItems = useMemo<TemplateItem[]>(() =>
    PIPELINE_TEMPLATES.map(tpl => {
      const id = slugify(tpl.name);
      return {
        id,
        source:      'builtin' as const,
        name:        tpl.name,
        emoji:       tpl.emoji,
        description: tpl.description,
        category:    tpl.category,
        tags:        tpl.tags,
        steps:       tpl.steps,
        createdAt:   '2024-01-01T00:00:00Z',
        cloneCount:  builtinCloneCounts[id] ?? 0,
      };
    }),
  [builtinCloneCounts]);

  // ── Normalise user templates into TemplateItem ────────────────────────────
  const userItems = useMemo<TemplateItem[]>(() =>
    userTemplates.map(p => ({
      id:          p.id,
      source:      'user' as const,
      name:        p.name,
      emoji:       p.emoji || '🔧',
      description: p.description || '',
      category:    (p.category as TemplateCategory) || 'Other',
      tags:        [p.category || 'Other'],
      steps:       p.steps.map(s => ({ ...s })),
      createdAt:   p.created_at,
      cloneCount:  p.clone_count || 0,
      pipeline:    p,
      isImported:  p.template_type === 'imported',
    })),
  [userTemplates]);

  // ── Combine & filter ───────────────────────────────────────────────────────
  const allItems = useMemo<TemplateItem[]>(() => [...userItems, ...builtinItems], [userItems, builtinItems]);

  const filtered = useMemo<TemplateItem[]>(() => {
    const q = search.trim().toLowerCase();
    let items: TemplateItem[];
    if (tab === 'My Templates') {
      items = userItems;
    } else if (tab === 'All') {
      items = allItems;
    } else {
      items = allItems.filter(t => t.category === tab);
    }
    if (q) {
      items = items.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)),
      );
    }
    // Client-side sort — for ratings we sort by item.cloneCount only;
    // rating-based sort requires cached stats. We do best-effort here.
    if (sort === 'most-used') {
      items = [...items].sort((a, b) => b.cloneCount - a.cloneCount);
    } else if (sort === 'newest') {
      items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // top-rated: can't sort client-side without all ratings loaded; keep insertion order
    return items;
  }, [tab, search, sort, allItems, userItems]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const res: Record<string, number> = {
      'My Templates': userItems.length,
      'All':          allItems.length,
    };
    (['Research', 'Writing', 'Code', 'Other'] as TemplateCategory[]).forEach(c => {
      res[c] = allItems.filter(t => t.category === c).length;
    });
    return res;
  }, [allItems, userItems]);

  // ── Clone template ─────────────────────────────────────────────────────────
  const cloneItem = useCallback(async (item: TemplateItem) => {
    if (cloningId) return;
    setCloningId(item.id);
    try {
      await pipelineService.createPipeline({
        name:        item.name,
        description: item.description,
        steps:       item.steps.map((s, i) => ({ ...s, step_index: i })),
        is_template: false,
        emoji:       item.emoji,
        category:    item.category,
      });
      // Increment clone count
      if (item.source === 'builtin') {
        await supabase.rpc('increment_builtin_clone_count', { p_template_id: item.id });
      } else {
        const { data: cur } = await supabase
          .from('agent_pipelines')
          .select('clone_count')
          .eq('id', item.id)
          .maybeSingle();
        await supabase
          .from('agent_pipelines')
          .update({ clone_count: (cur?.clone_count ?? 0) + 1 })
          .eq('id', item.id);
      }
      toast.success(`"${item.name}" added to your pipelines!`);
      setTimeout(() => navigate('/studio'), 900);
    } catch {
      toast.error('Failed to clone template — please try again');
    } finally {
      setCloningId(null);
      setPreview(null);
    }
  }, [cloningId, navigate]);

  // ── Export template ────────────────────────────────────────────────────────
  const exportItem = useCallback((item: TemplateItem) => {
    try {
      if (item.source === 'builtin') {
        const tpl = PIPELINE_TEMPLATES.find(t => slugify(t.name) === item.id);
        if (tpl) exportBuiltinTemplate(tpl);
      } else if (item.pipeline) {
        exportUserTemplate(item.pipeline);
      }
      toast.success('Template exported!');
    } catch {
      toast.error('Export failed — please try again');
    }
  }, []);

  // ── Share template — generate link + copy to clipboard ────────────────────
  const shareItem = useCallback(async (item: TemplateItem) => {
    if (sharingId) return;
    setSharingId(item.id);
    try {
      let token: string;
      if (item.source === 'builtin') {
        token = await templateShareService.shareBuiltinTemplate(item.id);
      } else {
        token = await templateShareService.shareUserTemplate(item.id);
      }
      const url = `${window.location.origin}/studio/template-share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied!', {
        description: url.length > 60 ? url.slice(0, 57) + '…' : url,
      });
    } catch {
      toast.error('Could not generate share link — please try again');
    } finally {
      setSharingId(null);
    }
  }, [sharingId]);

  // ── Delete user template ───────────────────────────────────────────────────
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await pipelineService.deletePipeline(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      await loadUserTemplates();
    } catch {
      toast.error('Delete failed — please try again');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleting, loadUserTemplates]);

  // ── Import template from JSON ──────────────────────────────────────────────
  const handleImport = useCallback(async (tpl: PipelineTemplate) => {
    await pipelineService.createPipeline({
      name:          tpl.name,
      description:   tpl.description,
      steps:         tpl.steps.map((s, i) => ({ ...s, step_index: i })),
      is_template:   true,
      template_type: 'imported',
      emoji:         tpl.emoji,
      category:      tpl.category,
    });
    toast.success(`"${tpl.name}" imported as a template!`);
    await loadUserTemplates();
    setTab('My Templates');
  }, [loadUserTemplates]);

  // ── Page-level drag-drop for JSON files ────────────────────────────────────
  const handlePageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handlePageDragLeave = () => setDragOver(false);
  const handlePageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.json')) {
      setImportOpen(true);
    } else if (file) {
      toast.error('Only .json files are supported for import');
    }
  };

  // Suppress unused fingerprint warning — it's consumed by hooks implicitly
  void fingerprint;

  return (
    <div
      className={cn('min-h-screen bg-background transition-all', dragOver && 'ring-2 ring-primary ring-inset')}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/studio')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LayoutTemplate className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-bold text-sm truncate">Template Library</span>
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full hidden sm:inline-flex">
              {allItems.length} templates
            </span>
          </div>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs shrink-0 gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex"
            onClick={() => navigate('/studio')}
          >
            <Layers className="h-3.5 w-3.5" />My Pipelines
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs shrink-0 gap-1.5 border border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-balance">Pipeline Templates</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl text-pretty leading-relaxed">
            Browse, rate, import, and clone multi-step AI pipelines. Save your own pipelines as templates
            and share them — drag a JSON file onto this page to import instantly.
          </p>
          {dragOver && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium animate-pulse">
              <Upload className="h-4 w-4" />Drop JSON file to import template
            </div>
          )}
        </div>
      </div>

      {/* ── Filters bar ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 border border-border shrink-0">
                <SortAsc className="h-3.5 w-3.5" />
                <span className="text-xs">{SORT_OPTIONS.find(s => s.id === sort)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {SORT_OPTIONS.map(s => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn('text-xs', sort === s.id && 'text-primary font-semibold')}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tab row */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-3 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
              )}
            >
              {t.id === 'My Templates'
                ? <User className="h-3 w-3" />
                : t.id === 'All'
                  ? <Package className="h-3 w-3" />
                  : null}
              {t.label}
              {tabCounts[t.id] > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 rounded-full',
                  tab === t.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-border text-muted-foreground',
                )}>
                  {tabCounts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {filtered.length === allItems.length
            ? `${filtered.length} templates`
            : `${filtered.length} of ${allItems.length} templates`}
          {search && <span className="ml-1">matching <strong className="text-foreground">"{search}"</strong></span>}
        </p>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16">

        {/* My Templates section header */}
        {tab !== 'My Templates' && userItems.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <User className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">My Templates</span>
            <span className="text-[10px] text-violet-400/50">({userItems.length})</span>
            <div className="flex-1 h-px bg-violet-500/15" />
          </div>
        )}

        {/* Loading skeletons for user templates */}
        {loadingUser && tab === 'My Templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state: My Templates tab with no templates */}
        {!loadingUser && tab === 'My Templates' && userItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <User className="h-7 w-7 text-violet-400/40" />
            </div>
            <p className="font-semibold text-sm">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-pretty">
              Save any pipeline as a template from the Pipeline Builder, or import a JSON template file.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/studio')}>
                Go to Studio
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" />Import
              </Button>
            </div>
          </div>
        )}

        {/* Main grid */}
        {filtered.length === 0 && (tab !== 'My Templates' || (!loadingUser && userItems.length > 0)) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-sm">No templates found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-pretty">
              {search ? `No templates match "${search}". Try a different search term.` : 'No templates in this category.'}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setTab('All'); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <TemplateCard
                key={item.id}
                item={item}
                onUse={() => cloneItem(item)}
                onPreview={() => setPreview(item)}
                onExport={() => exportItem(item)}
                onShare={() => shareItem(item)}
                onEdit={item.source === 'user' ? () => navigate(`/studio/${item.id}`) : undefined}
                onDelete={item.source === 'user' ? () => setDeleteTarget(item.pipeline!) : undefined}
                cloning={cloningId === item.id}
                sharing={sharingId === item.id}
              />
            ))}
          </div>
        )}

        {/* Built-in section divider (when showing All or category) */}
        {tab !== 'My Templates' && userItems.length > 0 && builtinItems.length > 0 && filtered.some(i => i.source === 'user') && filtered.some(i => i.source === 'builtin') && (
          <div className="flex items-center gap-2 my-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Built-in Templates</span>
            <div className="flex-1 h-px bg-amber-500/15" />
          </div>
        )}
      </div>

      {/* ── Preview modal ─────────────────────────────────────────────────── */}
      <PreviewModal
        item={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
        onClone={cloneItem}
        onShare={shareItem}
        cloning={!!cloningId}
        sharing={!!sharingId}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.name}"</strong> will be removed from your templates.
              Any pipelines already cloned from it will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Import modal ──────────────────────────────────────────────────── */}
      <TemplateImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
