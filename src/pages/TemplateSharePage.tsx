/**
 * TemplateSharePage — fully public route at /studio/template-share/:shareToken
 *
 * - No authentication required
 * - Amber / violet gradient header
 * - Interactive anonymous star rating
 * - Clone to Studio CTA
 * - Full responsive layout
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, GitFork, LayoutTemplate, Loader2,
  ChevronRight, Copy, CheckCheck, AlertTriangle,
} from 'lucide-react';
import {
  templateShareService,
  type SharedTemplateData,
} from '@/services/template-share.service';
import { pipelineService } from '@/services/pipeline.service';
import { useTemplateRatings } from '@/hooks/use-template-ratings';
import { supabase } from '@/db/supabase';
import type { TemplateCategory } from '@/data/pipelineTemplates';

// ── Category badge colours ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Research: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  Writing:  'bg-violet-500/10 text-violet-400 border-violet-500/25',
  Code:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  Other:    'bg-orange-500/10 text-orange-400 border-orange-500/25',
};

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  total,
}: {
  step: SharedTemplateData['steps'][0];
  index: number;
  total: number;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* connector */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary">
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 bg-border/60 mt-1.5 min-h-[20px]" />
        )}
      </div>
      {/* content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-base leading-none">{step.persona_emoji}</span>
          <span className="font-semibold text-sm">{step.persona_name}</span>
          {step.role && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
              {step.role}
            </span>
          )}
        </div>
        {step.instruction && (
          <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
            {step.instruction}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Rating section ─────────────────────────────────────────────────────────────

function RatingSection({
  templateId,
  templateType,
}: {
  templateId: string;
  templateType: 'builtin' | 'user';
}) {
  const { stats, submitting, submitRating } = useTemplateRatings({
    templateId,
    templateType,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Rate this template
      </p>
      <StarRating
        average={stats.average}
        count={stats.count}
        userRating={stats.userRating}
        interactive
        onRate={star => {
          submitRating(star).then(() => toast.success('Rating saved!'));
        }}
        submitting={submitting}
        size="md"
        showCount
      />
      <p className="text-[11px] text-muted-foreground/60">
        Anonymous · no login required
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TemplateSharePage
// ══════════════════════════════════════════════════════════════════════════════

export default function TemplateSharePage() {
  const { shareToken = '' } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [tpl, setTpl]         = useState<SharedTemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied]   = useState(false);

  // Fetch template data on mount
  useEffect(() => {
    if (!shareToken) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    templateShareService.getSharedTemplate(shareToken)
      .then(data => {
        if (!data) setNotFound(true);
        else {
          setTpl(data);
          document.title = `${data.name} — Forge Template`;
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    return () => { document.title = 'Forge'; };
  }, [shareToken]);

  // Copy share URL to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Share link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please copy the URL manually');
    }
  };

  // Clone the template as a new pipeline
  const handleClone = async () => {
    if (!tpl || cloning) return;
    setCloning(true);
    try {
      const pipeline = await pipelineService.createPipeline({
        name:        tpl.name,
        description: tpl.description,
        steps:       tpl.steps.map((s, i) => ({ ...s, step_index: i })),
        is_template: false,
        emoji:       tpl.emoji,
        category:    tpl.category as TemplateCategory,
      });

      // Increment clone count
      if (tpl.templateType === 'builtin') {
        await supabase.rpc('increment_builtin_clone_count', {
          p_template_id: tpl.templateId,
        });
      } else {
        const { data: cur } = await supabase
          .from('agent_pipelines')
          .select('clone_count')
          .eq('id', tpl.templateId)
          .maybeSingle();
        await supabase
          .from('agent_pipelines')
          .update({ clone_count: ((cur as { clone_count?: number } | null)?.clone_count ?? 0) + 1 })
          .eq('id', tpl.templateId);
      }

      toast.success(`"${tpl.name}" cloned to your studio!`);
      navigate(`/studio`);
    } catch {
      toast.error('Failed to clone — please try again');
    } finally {
      setCloning(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* skeleton header gradient */}
        <div className="h-48 md:h-56 bg-gradient-to-br from-amber-500/10 via-violet-500/10 to-transparent border-b border-border animate-pulse" />
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
          <div className="h-5 w-1/3 rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted/50 animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────

  if (notFound || !tpl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <h1 className="font-bold text-lg mb-1">Template not found</h1>
          <p className="text-sm text-muted-foreground mb-6 text-pretty">
            This share link may have expired or the template has been deleted.
          </p>
          <Button asChild>
            <Link to="/studio/templates">
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Browse Templates
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────

  const catColor = CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.Other;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Back nav ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <LayoutTemplate className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold flex-1 min-w-0 truncate">Forge Template</span>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground border border-border"
            onClick={handleCopy}
          >
            {copied
              ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      </div>

      {/* ── Hero gradient header ─────────────────────────────────────────── */}
      <div className="relative border-b border-border overflow-hidden">
        {/* dual-tone gradient: amber to violet */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-violet-600/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14">
          {/* emoji + name */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn(
              'h-14 w-14 rounded-2xl border flex items-center justify-center text-2xl shrink-0',
              tpl.templateType === 'user'
                ? 'bg-violet-500/15 border-violet-500/30'
                : 'bg-amber-500/15 border-amber-500/30',
            )}>
              {tpl.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-balance leading-tight mb-1">
                {tpl.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', catColor)}>
                  {tpl.category}
                </span>
                {tpl.tags.filter(t => t !== tpl.category).map(tag => (
                  <span key={tag} className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
                {tpl.templateType === 'user' && (
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                    Community
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* description */}
          {tpl.description && (
            <p className="text-sm text-muted-foreground text-pretty leading-relaxed max-w-xl">
              {tpl.description}
            </p>
          )}

          {/* stats row */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5" />
              {tpl.cloneCount} clone{tpl.cloneCount !== 1 ? 's' : ''}
            </span>
            <span>·</span>
            <span>{tpl.steps.length} agent{tpl.steps.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-start">

          {/* Left — step breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Pipeline Steps
            </p>
            <div className="rounded-2xl border border-border bg-card/50 p-5">
              {tpl.steps.map((step, i) => (
                <StepCard key={i} step={step} index={i} total={tpl.steps.length} />
              ))}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 pl-3">
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
                Final output
              </div>
            </div>
          </div>

          {/* Right — actions + rating */}
          <div className="md:sticky md:top-20 space-y-6">

            {/* Clone CTA */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
              <p className="text-sm font-semibold">Use this template</p>
              <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                Clone it into your Agent Studio as a new pipeline you can customise and run.
              </p>
              <Button
                className={cn(
                  'w-full h-10 gap-2 font-semibold',
                  tpl.templateType === 'user'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-black',
                )}
                onClick={handleClone}
                disabled={cloning}
              >
                {cloning
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <GitFork className="h-4 w-4" />}
                Clone to My Studio
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-xs gap-1.5 border border-border text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link to="/studio/templates">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  View Template Library
                </Link>
              </Button>
            </div>

            {/* Rating */}
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <RatingSection
                templateId={tpl.templateId}
                templateType={tpl.templateType}
              />
            </div>

            {/* Share / copy */}
            <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share</p>
              <p className="text-[11px] text-muted-foreground/70 break-all font-mono leading-relaxed">
                {window.location.href}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs gap-1.5 border border-border"
                onClick={handleCopy}
              >
                {copied
                  ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                  : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
