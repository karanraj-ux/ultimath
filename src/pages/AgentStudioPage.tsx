import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Plus, Play, Square, Trash2, ChevronDown, ChevronUp,
  Copy, Download, Sparkles, Clock, CheckCircle2, Loader2,
  FlaskConical, BookOpen, Swords, TrendingUp, PenTool, RotateCcw,
  X, ArrowRight, Save, ChevronRight, Users, Zap, Layers,
  GitFork, MessageSquare, Cpu, Info, Share2, Upload, FileJson,
  Bookmark, BookmarkCheck,
} from 'lucide-react';
import { pipelineService } from '@/services/pipeline.service';
import { personaService } from '@/services/persona.service';
import { useAgentPipeline, type LiveStepState } from '@/hooks/use-agent-pipeline';
import type { AgentPipeline, CollabMode, PipelineStep, Persona } from '@/types/types';
import { Streamdown } from 'streamdown';

// ─── Collaboration modes config ───────────────────────────────────────────────

interface ModeConfig {
  id: CollabMode;
  icon: React.ReactNode;
  label: string;
  tagline: string;
  description: string;
  color: string;
  bgGradient: string;
  minAgents: number;
  badge?: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'sequential',
    icon: <ArrowRight className="h-5 w-5" />,
    label: 'Pipeline',
    tagline: 'Chain → Refine → Deliver',
    description: 'Agents work in sequence. Each one reads all prior output and adds their unique contribution — Researcher → Writer → Editor → SEO.',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/15 to-blue-500/5 border-blue-500/30',
    minAgents: 2,
  },
  {
    id: 'roundtable',
    icon: <Users className="h-5 w-5" />,
    label: 'Roundtable',
    tagline: 'Debate → React → Synthesize',
    description: 'All agents speak in rounds, responding to and challenging each other. A final synthesis distills the best consensus.',
    color: 'text-violet-400',
    bgGradient: 'from-violet-500/15 to-violet-500/5 border-violet-500/30',
    minAgents: 2,
    badge: 'Unique',
  },
  {
    id: 'swarm',
    icon: <Layers className="h-5 w-5" />,
    label: 'Swarm',
    tagline: 'Parallel → Merge → Amplify',
    description: 'All agents tackle the same prompt independently from their own angle, then a Master Synthesizer merges every perspective into one superior output.',
    color: 'text-amber-400',
    bgGradient: 'from-amber-500/15 to-amber-500/5 border-amber-500/30',
    minAgents: 2,
    badge: 'Powerful',
  },
  {
    id: 'story',
    icon: <BookOpen className="h-5 w-5" />,
    label: 'Story Chain',
    tagline: 'Write → Continue → Complete',
    description: 'Agents co-author a narrative, each picking up exactly where the last left off — for collaborative fiction, reports, or structured long-form content.',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30',
    minAgents: 2,
  },
];

// ─── Built-in template definitions ────────────────────────────────────────────

const BUILTIN_TEMPLATES: Record<CollabMode, { name: string; description: string; steps: Omit<PipelineStep, 'step_index'>[] }> = {
  sequential: {
    name: 'Content Factory',
    description: 'Researcher → Writer → Editor → SEO Specialist. The classic content production pipeline.',
    steps: [
      { persona_name: 'Researcher', persona_emoji: '🔬', role: 'Research Specialist', instruction: 'Research the topic deeply. Gather key facts, statistics, expert opinions, and context. Present findings as structured notes.', model: 'gemini-2.5-flash' },
      { persona_name: 'Writer', persona_emoji: '✍️', role: 'Content Writer', instruction: 'Transform the research notes into a well-structured, engaging article. Use clear headings, vivid examples, and a compelling narrative arc.', model: 'gemini-2.5-flash' },
      { persona_name: 'Editor', persona_emoji: '📝', role: 'Senior Editor', instruction: 'Polish the draft. Fix tone, clarity, flow, and remove redundancy. Ensure every sentence earns its place.', model: 'gemini-2.5-flash' },
      { persona_name: 'SEO Specialist', persona_emoji: '📈', role: 'SEO Optimizer', instruction: 'Add SEO improvements: meta description, keyword optimization, internal link suggestions, and a compelling title. Present the final SEO-ready version.', model: 'gemini-2.5-flash' },
    ],
  },
  roundtable: {
    name: "Perspectives Debate",
    description: 'The Devil\'s Advocate vs The Scientist vs The Philosopher — 2 rounds of debate with a final synthesis.',
    steps: [
      { persona_name: "The Devil's Advocate", persona_emoji: '😈', role: "Contrarian", instruction: 'Challenge every assumption presented. Find the strongest counterargument, the hidden flaw, the overlooked risk. Be direct and intellectually honest. End with your sharpest objection.', model: 'gemini-2.5-flash' },
      { persona_name: 'The Scientist', persona_emoji: '🔬', role: 'Evidence Analyst', instruction: 'What does the evidence actually say? Distinguish between what is proven, what is probable, and what is speculation. Flag any claims that exceed the data. Ask for sources.', model: 'gemini-2.5-flash' },
      { persona_name: 'The Philosopher', persona_emoji: '🎭', role: 'Deep Thinker', instruction: 'Go beneath the surface. What assumptions are being made? What are the ethical implications? Use a thought experiment to illuminate the core tension. End with a question that reframes everything.', model: 'gemini-2.5-flash' },
    ],
  },
  swarm: {
    name: 'Expert Swarm',
    description: 'CEO Mentor + The Creative + The Lawyer + The Historian all tackle the same question from their own lens, then merge.',
    steps: [
      { persona_name: 'The CEO Mentor', persona_emoji: '💼', role: 'Strategic Lens', instruction: 'Analyse this through a pure business strategy lens. What are the ROI implications, the execution risks, and the competitive moat? What is the one thing that makes or breaks this?', model: 'gemini-2.5-flash' },
      { persona_name: 'The Creative', persona_emoji: '🎨', role: 'Lateral Thinker', instruction: 'Throw out conventional thinking. What surprising angle has everyone missed? What unexpected connection or reframe makes this suddenly obvious? Bring wild ideas — judge them later.', model: 'gemini-2.5-flash' },
      { persona_name: 'The Lawyer', persona_emoji: '⚖️', role: 'Risk Auditor', instruction: 'What could go wrong legally, contractually, or in terms of liability? What is ambiguous? Who bears the risk? Surface the hidden risks before they become real problems.', model: 'gemini-2.5-flash' },
      { persona_name: 'The Historian', persona_emoji: '🌍', role: 'Historical Context', instruction: 'Has something like this happened before? What historical parallels, precedents, or patterns apply? What did people miss last time? Connect the past to what is happening now.', model: 'gemini-2.5-flash' },
    ],
  },
  story: {
    name: 'Story Workshop',
    description: 'World-builder → Character Voice → Conflict Architect → Resolution Weaver. Co-author a story chapter by chapter.',
    steps: [
      { persona_name: 'World-Builder', persona_emoji: '🌍', role: 'Setting & Atmosphere', instruction: 'Open the story. Establish the world, time, place, and atmosphere with vivid sensory detail. Introduce at least one intriguing character. End at a moment of rising tension.', model: 'gemini-2.5-flash' },
      { persona_name: 'Character Weaver', persona_emoji: '🎭', role: 'Character Voice', instruction: 'Advance the protagonist. Show their inner world, desires, and fears through action and dialogue. Build emotional tension. Hand off at a critical decision point.', model: 'gemini-2.5-flash' },
      { persona_name: 'Conflict Architect', persona_emoji: '⚡', role: 'Plot Escalation', instruction: 'Escalate the conflict. Introduce a complication that makes everything harder. Raise the stakes dramatically. End on the darkest moment before the turn.', model: 'gemini-2.5-flash' },
      { persona_name: 'Resolution Weaver', persona_emoji: '🌅', role: 'Satisfying Conclusion', instruction: 'Resolve the story. Show how the protagonist faces their moment of truth. Bring themes full-circle. End with a final image that resonates long after the last word.', model: 'gemini-2.5-flash' },
    ],
  },
};

// ─── Default models ───────────────────────────────────────────────────────────

import { PIPELINE_TEMPLATES } from '@/data/pipelineTemplates';

const DEFAULT_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gpt-4o-mini',      label: 'GPT-4o Mini' },
  { value: 'gpt-4o',           label: 'GPT-4o' },
  { value: 'claude-3-haiku-20240307', label: 'Claude Haiku' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
];

// ─── Mode Selector ────────────────────────────────────────────────────────────

function ModeSelector({ selected, onChange }: { selected: CollabMode; onChange: (m: CollabMode) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {MODES.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            'relative rounded-2xl border p-4 text-left transition-all duration-200 hover:scale-[1.02]',
            selected === m.id
              ? `bg-gradient-to-br ${m.bgGradient} shadow-[0_0_20px_hsl(var(--primary)/0.1)]`
              : 'border-border bg-card/50 hover:border-border/80 hover:bg-card',
          )}
        >
          {m.badge && (
            <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {m.badge}
            </span>
          )}
          <div className={cn('mb-2', m.color)}>{m.icon}</div>
          <p className={cn('font-bold text-sm', selected === m.id ? 'text-foreground' : 'text-foreground/80')}>{m.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.tagline}</p>
          {selected === m.id && (
            <div className={cn('mt-2 pt-2 border-t border-current/20 text-[11px] leading-relaxed', m.color)}>
              {m.description}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Step status icon ─────────────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: LiveStepState['status'] }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
  if (status === 'done')    return <CheckCircle2 className="h-4 w-4 text-[hsl(152_68%_44%)]" />;
  if (status === 'error')   return <X className="h-4 w-4 text-destructive" />;
  return <div className="h-4 w-4 rounded-full border-2 border-border" />;
}

// ─── Agent output card ────────────────────────────────────────────────────────

function AgentOutputCard({
  liveStep,
  isActive,
  mode,
}: {
  liveStep: LiveStepState;
  isActive: boolean;
  mode: CollabMode;
}) {
  const [expanded, setExpanded] = useState(true);
  const content = liveStep.status === 'running' ? liveStep.partial_content : liveStep.full_content;

  useEffect(() => {
    if (liveStep.status === 'running') setExpanded(true);
  }, [liveStep.status]);

  const isSynth = liveStep.agent_emoji === '⚡' || liveStep.agent_emoji === '🌀';

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all duration-300',
      isActive    ? 'border-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.15)] bg-primary/[0.03]' :
      liveStep.status === 'done' && isSynth ? 'border-amber-500/40 bg-amber-500/[0.03]' :
      liveStep.status === 'done' ? 'border-[hsl(152_68%_44%/0.3)] bg-[hsl(152_68%_44%/0.03)]' :
      liveStep.status === 'error' ? 'border-destructive/30 bg-destructive/[0.03]' :
      'border-border bg-card/50',
    )}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <StepStatusIcon status={liveStep.status} />
        <span className="text-xl leading-none shrink-0">{liveStep.agent_emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{liveStep.agent_name}</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border',
              isSynth
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : mode === 'roundtable'
                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                  : 'bg-muted text-muted-foreground border-border',
            )}>
              {liveStep.role}
            </span>
          </div>
        </div>
        {liveStep.duration_ms != null && liveStep.status === 'done' && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />{(liveStep.duration_ms / 1000).toFixed(1)}s
          </span>
        )}
        {isActive && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium shrink-0 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Thinking…
          </span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && content && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50">
          <div className="prose prose-sm max-w-none text-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold [&_code]:text-xs [&_pre]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
            <Streamdown>{content + (liveStep.status === 'running' ? '▍' : '')}</Streamdown>
          </div>
        </div>
      )}

      {expanded && !content && liveStep.status === 'pending' && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50 text-xs text-muted-foreground italic">
          {mode === 'swarm' ? 'Ready — waiting for turn…' : 'Waiting for previous agents…'}
        </div>
      )}
    </div>
  );
}

// ─── Step builder row ─────────────────────────────────────────────────────────

function StepBuilderRow({
  step, index, total, personas, onChange, onDelete, onMoveUp, onMoveDown, mode,
}: {
  step: PipelineStep; index: number; total: number; personas: Persona[];
  onChange: (updated: PipelineStep) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; mode: CollabMode;
}) {
  const [open, setOpen] = useState(index === 0);

  const linkPersona = (pid: string) => {
    const found = personas.find(p => p.id === pid);
    if (found) onChange({ ...step, persona_id: found.id, persona_name: found.name, persona_emoji: found.emoji_avatar ?? '🤖', model: found.ai_model, system_prompt: found.system_prompt });
  };

  const modeLabel = mode === 'roundtable' ? 'Speaker' : mode === 'swarm' ? 'Expert' : mode === 'story' ? 'Author' : 'Agent';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button type="button" disabled={index === 0} onClick={onMoveUp} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button type="button" disabled={index === total - 1} onClick={onMoveDown} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">{index + 1}</div>
        <span className="text-xl leading-none shrink-0">{step.persona_emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.persona_name || `${modeLabel} ${index + 1}`}</p>
          <p className="text-[11px] text-muted-foreground truncate">{step.role || 'No role set'}</p>
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1 shrink-0 transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Link Persona (optional)</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={step.persona_id ?? ''}
                onChange={e => e.target.value ? linkPersona(e.target.value) : onChange({ ...step, persona_id: undefined })}
              >
                <option value="">— Custom agent —</option>
                {personas.map(p => <option key={p.id} value={p.id}>{p.emoji_avatar} {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">AI Model</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={step.model}
                onChange={e => onChange({ ...step, model: e.target.value })}
              >
                {DEFAULT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{modeLabel} Name</label>
              <div className="flex gap-1.5">
                <Input value={step.persona_emoji} onChange={e => onChange({ ...step, persona_emoji: e.target.value })} className="h-9 w-12 px-2 text-center text-lg" maxLength={2} />
                <Input value={step.persona_name} onChange={e => onChange({ ...step, persona_name: e.target.value })} className="h-9 flex-1" placeholder={`e.g. ${modeLabel}`} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Role Title</label>
              <Input value={step.role} onChange={e => onChange({ ...step, role: e.target.value })} className="h-9" placeholder="e.g. Research Specialist" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {mode === 'roundtable' ? 'Discussion Stance / Instruction' :
               mode === 'swarm'      ? 'Independent Task / Perspective' :
               mode === 'story'      ? 'Narrative Chapter Directive' :
               'Step Instruction'}
            </label>
            <Textarea
              value={step.instruction}
              onChange={e => onChange({ ...step, instruction: e.target.value })}
              className="min-h-[72px] text-sm resize-none"
              placeholder={
                mode === 'roundtable' ? 'What viewpoint does this agent champion or challenge?' :
                mode === 'swarm'      ? 'What unique angle does this expert bring independently?' :
                mode === 'story'      ? 'What does this author contribute to the narrative?' :
                'What does this agent do with the previous context?'
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode flow diagram ────────────────────────────────────────────────────────

function ModeFlowDiagram({ mode, steps }: { mode: CollabMode; steps: PipelineStep[] }) {
  const names = steps.slice(0, 4).map(s => `${s.persona_emoji} ${s.persona_name}`);
  const more  = steps.length > 4 ? `+${steps.length - 4} more` : null;

  if (mode === 'sequential') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {names.map((n, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{n}</span>
            {i < names.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </span>
        ))}
        {more && <span className="text-xs text-muted-foreground">→ {more}</span>}
      </div>
    );
  }
  if (mode === 'roundtable') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {names.map((n, i) => (
          <span key={i} className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">{n}</span>
        ))}
        {more && <span className="text-xs text-muted-foreground">{more}</span>}
        <span className="text-xs text-muted-foreground mx-1">→</span>
        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">⚡ Synthesis</span>
      </div>
    );
  }
  if (mode === 'swarm') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          {names.map((n, i) => (
            <span key={i} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{n}</span>
          ))}
          {more && <span className="text-xs text-muted-foreground pl-2">{more}</span>}
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">🌀 Master Synthesis</span>
      </div>
    );
  }
  // story
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {names.map((n, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{n}</span>
          {i < names.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        </span>
      ))}
      {more && <span className="text-xs text-muted-foreground">→ {more}</span>}
    </div>
  );
}

// ─── History run card ─────────────────────────────────────────────────────────

function HistoryRunCard({ run }: { run: import('@/types/types').PipelineRun }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(run.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="forge-card overflow-hidden">
      <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className={cn('h-2 w-2 rounded-full shrink-0', run.status === 'done' ? 'bg-[hsl(152_68%_44%)]' : run.status === 'error' ? 'bg-destructive' : 'bg-primary')} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{run.pipeline_name}</p>
          <p className="text-xs text-muted-foreground truncate">{run.input_prompt}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden md:block">{date}</span>
          <span className="text-xs text-muted-foreground">{run.steps_output?.length ?? 0} steps</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {run.steps_output?.map((s, i) => (
            <div key={i} className="px-4 py-3 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base leading-none">{s.agent_emoji}</span>
                <span className="text-xs font-semibold">{s.agent_name}</span>
                <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">{s.role}</span>
                <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{(s.duration_ms / 1000).toFixed(1)}s</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.content}</p>
            </div>
          ))}
          {run.final_output && (
            <div className="px-4 py-3 bg-muted/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Final Output</p>
              <div className="prose prose-sm max-w-none text-foreground [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs">
                <Streamdown>{run.final_output.slice(0, 800) + (run.final_output.length > 800 ? '\n\n…' : '')}</Streamdown>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                  onClick={() => { navigator.clipboard.writeText(run.final_output); toast.success('Copied!'); }}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    const blob = new Blob([run.final_output], { type: 'text/plain' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                    a.download = `${run.pipeline_name.replace(/\s+/g, '-').toLowerCase()}.txt`; a.click();
                  }}>
                  <Download className="h-3 w-3" /> Export
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentStudioPage() {
  const navigate = useNavigate();
  const outputEndRef = useRef<HTMLDivElement>(null);

  const [mode, setMode]               = useState<CollabMode>('sequential');
  const [rounds, setRounds]           = useState(2);
  const [pipelineName, setPipelineName] = useState('My Pipeline');
  const [steps, setSteps]             = useState<PipelineStep[]>([]);
  const [prompt, setPrompt]           = useState('');
  const [personas, setPersonas]       = useState<Persona[]>([]);
  const [templates, setTemplates]     = useState<AgentPipeline[]>([]);
  const [activeTab, setActiveTab]     = useState<'build' | 'run' | 'history'>('build');
  const [runHistory, setRunHistory]   = useState<import('@/types/types').PipelineRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [finalExpanded, setFinalExpanded]   = useState(true);
  // Track whether there are unsaved changes in the builder
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);

  const { running, liveSteps, finalOutput, runId, error, run, reset, abort } = useAgentPipeline();

  // Warn on browser refresh / tab close when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || steps.length === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, steps.length]);

  // Mark dirty when steps or name change (skip the initial mount)
  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; return; }
    setIsDirty(true);
  }, [steps, pipelineName]);

  useEffect(() => {
    pipelineService.getTemplates().then(setTemplates).catch(() => {});
    personaService.getPersonas().then(setPersonas).catch(() => {});
  }, []);

  useEffect(() => {
    if (running) outputEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [liveSteps, running]);

  useEffect(() => { if (running) setActiveTab('run'); }, [running]);

  useEffect(() => {
    if (activeTab === 'history') {
      setLoadingHistory(true);
      pipelineService.getRuns(20).then(setRunHistory).catch(() => {}).finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Load built-in template for the selected mode
  const loadBuiltinTemplate = () => {
    const t = BUILTIN_TEMPLATES[mode];
    setSteps(t.steps.map((s, i) => ({ ...s, step_index: i })));
    setPipelineName(t.name);
    setIsDirty(false); // loading a template is a clean state
    toast.success(`Loaded "${t.name}" template`);
  };

  // Load DB template
  const loadTemplate = (template: AgentPipeline) => {
    setSteps(template.steps.map(s => ({ ...s })));
    setPipelineName(template.name);
    setActiveTab('build');
    toast.success(`Loaded "${template.name}"`);
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      step_index: prev.length,
      persona_name: `Agent ${prev.length + 1}`,
      persona_emoji: '🤖',
      role: '',
      instruction: '',
      model: 'gemini-2.5-flash',
    }]);
  };

  const updateStep  = (i: number, s: PipelineStep) => setSteps(prev => prev.map((x, j) => j === i ? { ...s, step_index: i } : x));
  const deleteStep  = (i: number)                  => setSteps(prev => prev.filter((_, j) => j !== i).map((s, j) => ({ ...s, step_index: j })));
  const moveStep    = (i: number, dir: 'up' | 'down') => setSteps(prev => {
    const next = [...prev];
    const t = dir === 'up' ? i - 1 : i + 1;
    if (t < 0 || t >= next.length) return prev;
    [next[i], next[t]] = [next[t], next[i]];
    return next.map((s, j) => ({ ...s, step_index: j }));
  });

  const handleRun = async () => {
    if (!prompt.trim()) { toast.error('Enter a prompt first'); return; }
    const cfg = MODES.find(m2 => m2.id === mode)!;
    if (steps.length < cfg.minAgents) { toast.error(`Add at least ${cfg.minAgents} agents for ${cfg.label} mode`); return; }
    const bad = steps.find(s => !s.role.trim() || !s.instruction.trim());
    if (bad) { toast.error(`Complete role & instruction for "${bad.persona_name}"`); return; }
    reset();
    await run({ pipeline_name: pipelineName, input_prompt: prompt, steps, mode, rounds });
  };

  const handleSave = async () => {
    if (!pipelineName.trim() || steps.length < 1) { toast.error('Add a name and at least one agent'); return; }
    try {
      await pipelineService.createPipeline({ name: pipelineName, description: `${MODES.find(m2 => m2.id === mode)?.label} — ${steps.length} agents`, steps, is_template: false });
      setIsDirty(false);
      toast.success('Pipeline saved');
    } catch { toast.error('Failed to save pipeline'); }
  };

  // ── Share pipeline ────────────────────────────────────────────────────────
  const [sharing, setSharing] = useState(false);
  const [savedPipelineId, setSavedPipelineId] = useState<string | null>(null);

  const handleShare = async () => {
    setSharing(true);
    try {
      // Save pipeline first to get an id
      let pid = savedPipelineId;
      if (!pid) {
        if (!pipelineName.trim() || steps.length < 1) { toast.error('Save pipeline first'); setSharing(false); return; }
        const saved = await pipelineService.createPipeline({
          name: pipelineName,
          description: `${MODES.find(m2 => m2.id === mode)?.label} — ${steps.length} agents`,
          steps, is_template: false,
        });
        pid = saved.id;
        setSavedPipelineId(pid);
      }
      const token = await pipelineService.sharePipeline(pid!);
      const url = `${window.location.origin}/studio/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard!', { description: url });
    } catch { toast.error('Failed to generate share link'); }
    finally { setSharing(false); }
  };

  // ── Export pipeline as JSON ───────────────────────────────────────────────
  const handleExportJSON = () => {
    if (steps.length === 0) { toast.error('Add at least one agent before exporting'); return; }
    const payload = { name: pipelineName, mode, steps, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${pipelineName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    toast.success('Pipeline exported as JSON');
  };

  // ── Import pipeline from JSON ─────────────────────────────────────────────
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5 MB)'); return; }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.name || !Array.isArray(parsed.steps)) {
          toast.error('Invalid JSON — missing name or steps array'); return;
        }
        setPipelineName(parsed.name);
        if (parsed.mode) setMode(parsed.mode);
        setSteps(parsed.steps.map((s: PipelineStep, i: number) => ({ ...s, step_index: i })));
        setActiveTab('build');
        toast.success(`Imported "${parsed.name}" — ${parsed.steps.length} agents`);
      } catch { toast.error('Failed to parse JSON file'); }
    };
    input.click();
  };

  // ── Save as Template ──────────────────────────────────────────────────────
  const TEMPLATE_CATEGORIES = ['Research', 'Writing', 'Code', 'Other'] as const;
  type TemplCat = (typeof TEMPLATE_CATEGORIES)[number];
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [templCategory, setTemplCategory]           = useState<TemplCat>('Other');
  const [savingTemplate, setSavingTemplate]         = useState(false);

  const handleSaveAsTemplate = async () => {
    if (!pipelineName.trim() || steps.length < 1) {
      toast.error('Add a name and at least one agent before saving as template');
      return;
    }
    setSavingTemplate(true);
    try {
      await pipelineService.createPipeline({
        name:          pipelineName,
        description:   `${MODES.find(m2 => m2.id === mode)?.label} — ${steps.length} agents`,
        steps:         steps.map((s, i) => ({ ...s, step_index: i })),
        is_template:   true,
        template_type: 'user',
        category:      templCategory,
        emoji:         '🔧',
      });
      toast.success(`"${pipelineName}" saved as a template!`, {
        description: 'Find it under My Templates in the Template Library.',
        action: { label: 'View Templates', onClick: () => navigate('/studio/templates') },
      });
      setSaveAsTemplateOpen(false);
    } catch {
      toast.error('Failed to save as template — please try again');
    } finally {
      setSavingTemplate(false);
    }
  };

  const modeCfg = MODES.find(m2 => m2.id === mode)!;
  const activeStepIndex = liveSteps.findIndex(s => s.status === 'running');
  const doneCount  = liveSteps.filter(s => s.status === 'done').length;
  const totalSteps = liveSteps.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Sticky header ── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FlaskConical className="h-4 w-4 text-violet-400 shrink-0" />
            <h1 className="font-bold truncate">Agent Studio</h1>
            <span className="hidden md:inline-flex text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full shrink-0">BETA</span>
          </div>

          {/* Share / Export / Import / Save-as-Template toolbar */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleImportJSON}>
              <Upload className="h-3.5 w-3.5" />Import
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleExportJSON}>
              <FileJson className="h-3.5 w-3.5" />Export
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
              onClick={handleShare} disabled={sharing}>
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              Share
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25"
              onClick={() => setSaveAsTemplateOpen(true)}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 gap-0.5 shrink-0">
            {(['build', 'run', 'history'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                  activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'run' && running ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Live</span>
                ) : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* ══════════════════════════════════════════════════════════════
            BUILD TAB
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'build' && (
          <div className="space-y-6">

            {/* Collaboration mode selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Collaboration Mode</h2>
                <button type="button" onClick={loadBuiltinTemplate}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Sparkles className="h-3 w-3" /> Load "{BUILTIN_TEMPLATES[mode].name}" template
                </button>
              </div>
              <ModeSelector selected={mode} onChange={(m) => { setMode(m); setSteps([]); }} />
            </div>

            {/* Roundtable rounds config */}
            {mode === 'roundtable' && (
              <div className="forge-card p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Discussion Rounds</p>
                  <p className="text-xs text-muted-foreground">How many full rounds should agents debate before synthesis?</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setRounds(r => Math.max(1, r - 1))} className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-sm font-bold">−</button>
                  <span className="text-sm font-bold w-5 text-center">{rounds}</span>
                  <button type="button" onClick={() => setRounds(r => Math.min(4, r + 1))} className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-sm font-bold">+</button>
                </div>
              </div>
            )}

            {/* Pipeline name */}
            <div className="forge-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pipeline</h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground md:hidden"
                    onClick={handleImportJSON}>
                    <Upload className="h-3 w-3" />Import
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground md:hidden"
                    onClick={handleExportJSON}>
                    <FileJson className="h-3 w-3" />Export
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 md:hidden"
                    onClick={handleShare} disabled={sharing}>
                    {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}Share
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 md:hidden"
                    onClick={() => setSaveAsTemplateOpen(true)}
                  >
                    <Bookmark className="h-3 w-3" />Template
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSave}><Save className="h-3 w-3" />Save</Button>
                </div>
              </div>
              <Input value={pipelineName} onChange={e => setPipelineName(e.target.value)} className="h-9 font-medium" placeholder="Pipeline name…" />

              {/* Flow diagram */}
              {steps.length > 0 && (
                <div className="pt-1">
                  <ModeFlowDiagram mode={mode} steps={steps} />
                </div>
              )}
            </div>

            {/* Agent steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  {modeCfg.icon}
                  <span className={modeCfg.color}>
                    {mode === 'roundtable' ? 'Speakers' : mode === 'swarm' ? 'Expert Agents' : mode === 'story' ? 'Authors' : 'Pipeline Agents'}
                  </span>
                  <span className="text-muted-foreground font-normal">({steps.length})</span>
                </h2>
                <Button size="sm" onClick={addStep} className="h-7 text-xs gap-1.5"><Plus className="h-3 w-3" />Add Agent</Button>
              </div>

              {steps.length === 0 ? (
                <div className="forge-card p-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Cpu className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-sm mb-1">No agents yet</p>
                  <p className="text-xs text-muted-foreground text-pretty max-w-xs mx-auto mb-4">
                    {mode === 'sequential' ? 'Add agents that will work one after another, each building on the last.' :
                     mode === 'roundtable' ? 'Add speakers who will debate in multiple rounds before synthesising.' :
                     mode === 'swarm'      ? 'Add experts who will each tackle the prompt from their own angle simultaneously.' :
                     'Add authors who will each write a chapter of the collaborative narrative.'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={addStep} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Agent</Button>
                    <Button variant="outline" size="sm" onClick={loadBuiltinTemplate} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Use Template</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((s, i) => (
                    <StepBuilderRow
                      key={i} step={s} index={i} total={steps.length} personas={personas} mode={mode}
                      onChange={u => updateStep(i, u)} onDelete={() => deleteStep(i)}
                      onMoveUp={() => moveStep(i, 'up')} onMoveDown={() => moveStep(i, 'down')}
                    />
                  ))}
                  <Button variant="outline" size="sm" onClick={addStep} className="w-full h-9 gap-1.5 border-dashed text-muted-foreground hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />Add Another Agent
                  </Button>
                </div>
              )}
            </div>

            {/* Prompt + Run */}
            <div className="forge-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Your Prompt</h2>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                placeholder={
                  mode === 'sequential' ? 'What topic should the pipeline research, write, and polish?' :
                  mode === 'roundtable' ? 'What question should the panel debate and analyse?' :
                  mode === 'swarm'      ? 'What problem should every expert tackle from their own angle?' :
                  'What story premise, setting, or theme should the authors explore?'
                }
              />
              <div className="flex items-center gap-3">
                <Button onClick={handleRun} disabled={running || steps.length < modeCfg.minAgents} className="gap-2 flex-1">
                  {running ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</> : <><Play className="h-4 w-4" />Run {modeCfg.label}</>}
                </Button>
                {running && (
                  <Button variant="outline" onClick={abort} className="gap-1.5">
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                )}
              </div>
              {steps.length < modeCfg.minAgents && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3 w-3 shrink-0" />Requires at least {modeCfg.minAgents} agents
                </p>
              )}
            </div>

            {/* ── Quick-start Templates ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold">Quick-Start Templates</h2>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => navigate('/studio/templates')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Browse all →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PIPELINE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => {
                      setPipelineName(tpl.name);
                      setMode('sequential');
                      setSteps(tpl.steps.map((s, i) => ({ ...s, step_index: i })));
                      setActiveTab('build');
                      toast.success(`Loaded "${tpl.name}" template`);
                    }}
                    className="group text-left rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 p-4 transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{tpl.emoji}</span>
                      <span className="font-semibold text-sm text-amber-300">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-pretty leading-relaxed">{tpl.description}</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      {tpl.steps.map((s, i) => (
                        <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                          {s.persona_emoji} {s.persona_name}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-500/60 mt-2 group-hover:text-amber-400 transition-colors">
                      Click to use template →
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── DB Saved Templates ── */}
            {templates.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3">Saved Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => loadTemplate(t)}
                      className="forge-card forge-card-hover p-4 text-left">
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{t.steps.length} agents</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            RUN TAB — Live execution theater
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'run' && (
          <div className="space-y-4">
            {/* Status bar */}
            {(running || liveSteps.length > 0) && (
              <div className="forge-card p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {running
                      ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                      : finalOutput
                        ? <CheckCircle2 className="h-4 w-4 text-[hsl(152_68%_44%)] shrink-0" />
                        : <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <p className="font-semibold text-sm truncate">
                      {running ? `${modeCfg.label} in progress…` : finalOutput ? 'Pipeline complete' : 'Ready to run'}
                    </p>
                    {running && totalSteps > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {doneCount}/{totalSteps} agents done
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {running && <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={abort}><Square className="h-3 w-3" />Stop</Button>}
                    {!running && <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { reset(); setActiveTab('build'); }}><RotateCcw className="h-3 w-3" />New Run</Button>}
                  </div>
                </div>

                {/* Progress bar */}
                {totalSteps > 0 && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(doneCount / totalSteps) * 100}%` }}
                    />
                  </div>
                )}

                {/* Prompt */}
                {prompt && (
                  <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-border pl-3 line-clamp-2">
                    "{prompt}"
                  </p>
                )}
              </div>
            )}

            {/* Mode info banner */}
            {liveSteps.length > 0 && mode !== 'sequential' && (
              <div className={cn('rounded-xl border px-4 py-2 flex items-center gap-2 text-xs', modeCfg.bgGradient)}>
                <div className={modeCfg.color}>{modeCfg.icon}</div>
                <span className={cn('font-semibold', modeCfg.color)}>{modeCfg.label}:</span>
                <span className="text-muted-foreground">{modeCfg.tagline}</span>
                {mode === 'roundtable' && <span className="ml-auto text-muted-foreground shrink-0">{rounds} rounds · {steps.length} speakers</span>}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3">
                <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Agent cards */}
            {liveSteps.length > 0 ? (
              <div className="space-y-3">
                {liveSteps.map((s, i) => (
                  <AgentOutputCard key={`${s.step_index}-${i}`} liveStep={s} isActive={s.step_index === activeStepIndex} mode={mode} />
                ))}
              </div>
            ) : (
              <div className="forge-card p-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-semibold mb-1">No run yet</p>
                <p className="text-sm text-muted-foreground text-pretty max-w-xs mx-auto mb-4">Build your pipeline and hit Run to see all agents working live.</p>
                <Button variant="outline" onClick={() => setActiveTab('build')} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back to Builder
                </Button>
              </div>
            )}

            {/* Final output */}
            {finalOutput && (
              <div className="forge-card overflow-hidden">
                <button type="button" onClick={() => setFinalExpanded(e => !e)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">
                      {mode === 'swarm' || mode === 'roundtable' ? 'Synthesized Output' :
                       mode === 'story' ? 'Complete Narrative' : 'Final Output'}
                    </span>
                  </div>
                  {finalExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {finalExpanded && (
                  <div className="border-t border-border">
                    <div className="px-5 py-4">
                      <div className="prose prose-sm max-w-none text-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
                        <Streamdown>{finalOutput}</Streamdown>
                      </div>
                    </div>
                    <div className="border-t border-border px-4 py-3 flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                        onClick={() => { navigator.clipboard.writeText(finalOutput); toast.success('Copied to clipboard!'); }}>
                        <Copy className="h-3.5 w-3.5" />Copy
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                        onClick={() => {
                          const blob = new Blob([finalOutput], { type: 'text/plain' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                          a.download = `${pipelineName.replace(/\s+/g, '-').toLowerCase()}.txt`; a.click();
                        }}>
                        <Download className="h-3.5 w-3.5" />Export
                      </Button>
                      {runId && (
                        <span className="ml-auto text-[10px] text-muted-foreground self-center">Run ID: {runId.slice(0, 8)}…</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={outputEndRef} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            HISTORY TAB
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Run History</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setLoadingHistory(true); pipelineService.getRuns(20).then(setRunHistory).catch(() => {}).finally(() => setLoadingHistory(false)); }}>
                <RotateCcw className="h-3.5 w-3.5" />Refresh
              </Button>
            </div>

            {loadingHistory ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : runHistory.length === 0 ? (
              <div className="forge-card p-10 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-semibold">No runs yet</p>
                <p className="text-sm text-muted-foreground mt-1">Your pipeline execution history will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runHistory.map(r => <HistoryRunCard key={r.id} run={r} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Save as Template modal ──────────────────────────────────────── */}
      <Dialog open={saveAsTemplateOpen} onOpenChange={v => { if (!v) setSaveAsTemplateOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border border-amber-500/25">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-amber-400" />
              Save as Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pipeline name</p>
              <p className="text-sm font-semibold bg-muted/50 rounded-lg px-3 py-2 border border-border">
                {pipelineName || 'Untitled Pipeline'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplCategory(cat)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left',
                      templCategory === cat
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-muted/30 border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                    )}
                  >
                    {cat === 'Research' && '🔬 '}
                    {cat === 'Writing'  && '✍️ '}
                    {cat === 'Code'     && '💻 '}
                    {cat === 'Other'    && '⚡ '}
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This pipeline will appear in the{' '}
              <button
                type="button"
                className="text-amber-400 underline underline-offset-2"
                onClick={() => { setSaveAsTemplateOpen(false); navigate('/studio/templates'); }}
              >
                Template Library
              </button>{' '}
              under <strong>My Templates</strong>.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setSaveAsTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 flex-1 gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <BookmarkCheck className="h-3.5 w-3.5" />}
              Save as Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
