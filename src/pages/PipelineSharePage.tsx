import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  GitFork, ArrowLeft, Copy, CheckCircle2, AlertCircle,
  Layers, Zap, Loader2, ChevronRight,
} from 'lucide-react';
import { pipelineService } from '@/services/pipeline.service';
import type { AgentPipeline, PipelineStep } from '@/types/types';

// ── Step preview card ────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: PipelineStep; index: number }) {
  return (
    <div className="flex items-start gap-3">
      {/* Number + connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
          {index + 1}
        </div>
        {/* Connector line (not on last) */}
        <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />
      </div>

      {/* Card body */}
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-card/60 p-4 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{step.persona_emoji || '🤖'}</span>
          <span className="font-semibold text-sm">{step.persona_name}</span>
          {step.role && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">
              {step.role}
            </span>
          )}
        </div>
        {step.instruction && (
          <p className="text-xs text-muted-foreground text-pretty leading-relaxed line-clamp-3">
            {step.instruction}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground/60 font-mono">{step.model}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PipelineSharePage
// ═══════════════════════════════════════════════════════════════════════════════

export default function PipelineSharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<AgentPipeline | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cloning, setCloning]   = useState(false);
  const [cloned, setCloned]     = useState(false);

  useEffect(() => {
    if (!shareId) { setNotFound(true); setLoading(false); return; }
    pipelineService.getSharedPipeline(shareId)
      .then(data => {
        if (!data) setNotFound(true);
        else setPipeline(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  const handleClone = async () => {
    if (!pipeline) return;
    setCloning(true);
    try {
      const cloned = await pipelineService.clonePipeline(pipeline);
      setCloned(true);
      toast.success(`"${cloned.name}" added to your pipelines!`);
      setTimeout(() => navigate('/studio'), 1200);
    } catch {
      toast.error('Failed to clone pipeline — please try again');
    } finally {
      setCloning(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48 bg-muted rounded-lg" />
          <Skeleton className="h-4 w-full bg-muted rounded-lg" />
          <Skeleton className="h-24 w-full bg-muted rounded-xl" />
          <Skeleton className="h-24 w-full bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !pipeline) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Pipeline not found</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This pipeline may no longer be shared, or the link is invalid.
        </p>
        <Button className="mt-6 gap-2" onClick={() => navigate('/studio')}>
          <Layers className="h-4 w-4" />Open Agent Studio
        </Button>
      </div>
    );
  }

  // ── Pipeline share view ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GitFork className="h-4 w-4 text-violet-400 shrink-0" />
            <span className="font-bold text-sm truncate">Shared Pipeline</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs shrink-0" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" />Copy Link
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Pipeline meta */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-balance">{pipeline.name}</h1>
              {pipeline.description && (
                <p className="text-sm text-muted-foreground mt-1 text-pretty">{pipeline.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                  {pipeline.steps.length} agent{pipeline.steps.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Sequential
                </span>
              </div>
            </div>

            {/* Clone CTA */}
            <Button
              className="gap-2 shrink-0 shadow-lg"
              onClick={handleClone}
              disabled={cloning || cloned}
            >
              {cloned
                ? <><CheckCircle2 className="h-4 w-4" />Cloned!</>
                : cloning
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Cloning…</>
                  : <><GitFork className="h-4 w-4" />Clone to My Studio</>}
            </Button>
          </div>
        </div>

        {/* Steps overview */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Pipeline Steps
          </h2>

          <div className="relative">
            {pipeline.steps.map((step, i) => (
              <StepCard key={i} step={step} index={i} />
            ))}
          </div>

          {/* Arrow to final output */}
          <div className="flex items-center gap-2 mt-1 pl-4 text-xs text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
            <span>Final output</span>
          </div>
        </div>

        {/* Bottom clone CTA */}
        <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm">Want to use this pipeline?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Clone it to your Agent Studio with one click — you can customise any step.</p>
          </div>
          <Button
            className="gap-2 shrink-0"
            onClick={handleClone}
            disabled={cloning || cloned}
          >
            {cloned
              ? <><CheckCircle2 className="h-4 w-4" />Cloned!</>
              : cloning
                ? <><Loader2 className="h-4 w-4 animate-spin" />Cloning…</>
                : <><GitFork className="h-4 w-4" />Clone to My Studio</>}
          </Button>
        </div>

      </div>
    </div>
  );
}
