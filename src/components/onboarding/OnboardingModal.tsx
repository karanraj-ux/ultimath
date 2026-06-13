import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bot, Sparkles, MessageSquare, Sword, Share2,
  ArrowRight, ChevronLeft, X, Check, Zap, ShieldCheck,
  Globe, Brain, Users,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'forge_onboarding_done';

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Slight delay so page renders first
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  return { show, dismiss };
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i === current
              ? 'w-6 h-2 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]'
              : i < current
                ? 'w-2 h-2 bg-primary/60'
                : 'w-2 h-2 bg-muted',
          )}
        />
      ))}
    </div>
  );
}

// ─── Step Screens ─────────────────────────────────────────────────────────────

function Step1Welcome() {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      {/* Animated orb */}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl blur-3xl opacity-50 scale-150 animate-pulse"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
        <div
          className="relative h-24 w-24 rounded-3xl flex items-center justify-center shadow-[0_0_60px_hsl(var(--primary)/0.5)]"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}
        >
          <Bot className="h-12 w-12 text-white" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-3xl font-bold gradient-text">Welcome to Forge</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs text-pretty">
          The AI companion platform where you build custom personas, debate ideas in real time, and share AI agents with the world.
        </p>
      </div>

      {/* Mini feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { icon: <Sparkles className="h-3 w-3" />, label: 'Custom AI Personas' },
          { icon: <Sword className="h-3 w-3" />, label: 'Debate Rooms' },
          { icon: <ShieldCheck className="h-3 w-3" />, label: 'AI Fact Checking' },
          { icon: <Globe className="h-3 w-3" />, label: 'Public Sharing' },
        ].map(f => (
          <span key={f.label} className="forge-tag forge-tag-violet text-[11px]">
            {f.icon}{f.label}
          </span>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
        Let's take a quick tour — 30 seconds
      </p>
    </div>
  );
}

function Step2Personas() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-125"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
          <div className="relative h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Build AI Personas</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Craft custom AI agents with unique personalities, knowledge domains, and tone — then share them publicly or use them privately.
          </p>
        </div>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { emoji: '🧠', name: 'Socrates AI', tone: 'Socratic', domain: 'Philosophy', memory: true },
          { emoji: '💼', name: 'Deal Maker', tone: 'Professional', domain: 'Finance', memory: false },
        ].map(p => (
          <div key={p.name} className="gradient-border-card p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{p.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <span className="forge-tag forge-tag-violet text-[10px]">{p.tone}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{p.domain}</p>
            {p.memory && (
              <div className="flex items-center gap-1 text-[10px] text-primary">
                <Brain className="h-3 w-3" /> Memory enabled
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trait list */}
      <div className="space-y-2">
        {[
          'Choose tone: Friendly, Professional, Blunt, Playful, Socratic',
          'Set a knowledge domain (e.g. Law, Science, Gaming)',
          'Enable memory so your persona learns across chats',
          'Make it public and let anyone chat with it',
        ].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step3Chat() {
  const demoMessages = [
    { role: 'user', content: 'Explain quantum entanglement simply.' },
    { role: 'ai', content: 'Imagine two coins that always show opposite faces — wherever they are in the universe. That\'s entanglement.' },
    { role: 'user', content: 'Can we use it to teleport?' },
    { role: 'ai', content: 'Information can\'t travel faster than light, but quantum states can be "teleported" — a subtle distinction!' },
  ];

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-125"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(205 82% 56%))' }} />
          <div className="relative h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(205 82% 56%))' }}>
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Chat with Any Persona</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Select a persona, switch models (Gemini, GPT, Claude), and have rich multi-turn conversations.
          </p>
        </div>
      </div>

      {/* Mini chat preview */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-xs font-semibold">Socrates AI</span>
          <span className="forge-tag forge-tag-violet text-[10px] ml-auto">Gemini 2.5</span>
        </div>
        <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
          {demoMessages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
              <div className={cn(
                'max-w-[80%] px-3 py-1.5 rounded-xl text-xs leading-relaxed',
                m.role === 'user'
                  ? 'text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm',
              )}
                style={m.role === 'user' ? { background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))' } : undefined}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {[
          { icon: <Zap className="h-3 w-3" />, label: 'Multi-model' },
          { icon: <Brain className="h-3 w-3" />, label: 'Persistent memory' },
          { icon: <MessageSquare className="h-3 w-3" />, label: 'Conversation history' },
        ].map(f => (
          <span key={f.label} className="forge-tag forge-tag-violet text-[10px]">
            {f.icon}{f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step4Rooms() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-125"
            style={{ background: 'linear-gradient(135deg, hsl(22 90% 50%), hsl(316 70% 58%))' }} />
          <div className="relative h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(22 90% 50%), hsl(316 70% 58%))' }}>
            <Sword className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Debate Rooms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Create topic-based debate rooms. Multiple participants join, argue their points, and AI fact-checks every claim in real time.
          </p>
        </div>
      </div>

      {/* Mini room card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(22 90% 50%), hsl(316 70% 58%))' }} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="font-bold text-sm">Was the moon landing faked?</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="forge-tag forge-tag-green text-[10px]"><Globe className="h-2.5 w-2.5" />Public</span>
                <span className="text-[10px] text-muted-foreground font-mono">#MN7X2A</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">4</span>
            </div>
          </div>

          {/* Verdict preview */}
          <div className="rounded-lg border-2 border-[hsl(152_68%_44%/0.4)] bg-[hsl(152_68%_44%/0.05)] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(152_68%_44%)]" />
              <span className="text-[10px] font-bold text-[hsl(152_68%_44%)] uppercase">Verified</span>
              <span className="ml-auto text-[9px] text-muted-foreground font-mono bg-muted px-1 rounded">SEALED</span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              NASA moon landings are supported by 382kg of lunar samples and independent tracking from multiple countries.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[
          'Join any public room with a 6-letter code — no account needed',
          'AI moderator fact-checks claims with cited sources',
          'Verdicts are permanently sealed and shareable',
        ].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step5Share({ onFinish, navigate }: { onFinish: () => void; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-125"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
        <div className="relative h-16 w-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
          <Share2 className="h-8 w-8 text-white" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Share & Explore</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-pretty">
          Make your personas public — anyone can chat with them via a shareable link. Browse the community gallery for inspiration.
        </p>
      </div>

      {/* Share actions */}
      <div className="grid grid-cols-1 gap-2.5 w-full max-w-xs">
        {[
          { icon: <Globe className="h-4 w-4" />, title: 'Public Gallery', desc: 'Browse community personas', action: () => { onFinish(); navigate('/personas/gallery'); }, color: 'forge-tag-green' },
          { icon: <Sparkles className="h-4 w-4" />, title: 'Create Persona', desc: 'Build your first AI agent', action: () => { onFinish(); navigate('/personas/create'); }, color: 'forge-tag-violet' },
          { icon: <Sword className="h-4 w-4" />, title: 'Start a Debate', desc: 'Open a debate room', action: () => { onFinish(); navigate('/group-chat'); }, color: 'forge-tag-amber' },
        ].map(item => (
          <button
            key={item.title}
            type="button"
            onClick={item.action}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-left transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Welcome', component: Step1Welcome },
  { title: 'Personas', component: Step2Personas },
  { title: 'Chat', component: Step3Chat },
  { title: 'Debate', component: Step4Rooms },
  { title: 'Share', component: null }, // rendered separately
];

interface OnboardingModalProps {
  open: boolean;
  onDismiss: () => void;
}

export default function OnboardingModal({ open, onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  if (!open) return null;

  const total = STEPS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleNext = () => {
    if (isLast) { onDismiss(); return; }
    setStep(s => s + 1);
  };
  const handleBack = () => setStep(s => Math.max(0, s - 1));

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1Welcome />;
      case 1: return <Step2Personas />;
      case 2: return <Step3Chat />;
      case 3: return <Step4Rooms />;
      case 4: return <Step5Share onFinish={onDismiss} navigate={navigate} />;
      default: return null;
    }
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-[0_32px_80px_hsl(0_0%_0%/0.6)] overflow-hidden animate-fade-up"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, hsl(262 90% 66%), hsl(316 70% 58%), hsl(205 82% 56%))' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
          <StepDots total={total} current={step} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{step + 1} / {total}</span>
            <button
              type="button"
              onClick={onDismiss}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Skip onboarding"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step content — scrollable */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90dvh - 130px)' }}>
          {renderStep()}
        </div>

        {/* Footer nav */}
        <div className="shrink-0 border-t border-border px-5 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isFirst}
            className="gap-1.5 h-9"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Skip tour
            </button>
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1.5 h-9 px-5"
              style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))' }}
            >
              {isLast ? (
                <>Get Started <Sparkles className="h-3.5 w-3.5" /></>
              ) : (
                <>Next <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
