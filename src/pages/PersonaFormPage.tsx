import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Persona } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Check, Sparkles, Brain, MessageSquare,
  Globe, MemoryStick, Bot, User,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const TONES = [
  { value: 'friendly',     label: 'Friendly',     emoji: '😊', desc: 'Warm and approachable' },
  { value: 'professional', label: 'Professional',  emoji: '💼', desc: 'Formal and precise' },
  { value: 'blunt',        label: 'Blunt',         emoji: '⚡', desc: 'Direct and no-nonsense' },
  { value: 'playful',      label: 'Playful',       emoji: '🎭', desc: 'Fun and spontaneous' },
  { value: 'socratic',     label: 'Socratic',      emoji: '🦉', desc: 'Questions everything' },
] as const;

const DOMAINS = [
  'Technology', 'Science', 'Philosophy', 'History', 'Literature',
  'Politics', 'Finance', 'Health', 'Arts', 'Sports', 'Gaming', 'Law',
  'Psychology', 'Engineering', 'Mathematics', 'Music', 'Film', 'Food',
];

const EMOJIS = [
  '🤖','🧠','⚡','🎭','🦊','🐉','👾','🔮','🌌','🦋',
  '🧬','🎯','🌪️','🔥','🌊','🎪','🦄','👁️','🌀','🎲',
];

const PERSONALITY_SLIDERS: { key: string; label: string; left: string; right: string }[] = [
  { key: 'creativity',  label: 'Creativity',   left: 'Logical',    right: 'Creative' },
  { key: 'warmth',      label: 'Warmth',        left: 'Cold',       right: 'Warm' },
  { key: 'directness',  label: 'Directness',    left: 'Indirect',   right: 'Direct' },
  { key: 'humor',       label: 'Humor',         left: 'Serious',    right: 'Humorous' },
  { key: 'formality',   label: 'Formality',     left: 'Casual',     right: 'Formal' },
];

const STEPS = [
  { id: 1, label: 'Identity',    icon: <User className="h-3.5 w-3.5" /> },
  { id: 2, label: 'Personality', icon: <Brain className="h-3.5 w-3.5" /> },
  { id: 3, label: 'Knowledge',   icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 4, label: 'Behavior',    icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 5, label: 'Finish',      icon: <Sparkles className="h-3.5 w-3.5" /> },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(form: FormState): string {
  const traitDesc = PERSONALITY_SLIDERS.map(s => {
    const v = form.traits[s.key] ?? 50;
    const side = v > 60 ? s.right : v < 40 ? s.left : 'balanced';
    return `${s.label}: ${side} (${v}%)`;
  }).join(', ');

  return [
    `You are ${form.name}.`,
    form.description && `About you: ${form.description}`,
    `Personality: ${traitDesc}.`,
    `Tone: ${form.tone}.`,
    form.domains.length > 0 && `Your knowledge domains: ${form.domains.join(', ')}.`,
    form.memory_enabled && `You remember previous conversations and reference them naturally.`,
    form.custom_prompt && form.custom_prompt,
  ].filter(Boolean).join('\n');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  emoji_avatar: string;
  tone: string;
  traits: Record<string, number>;
  domains: string[];
  memory_enabled: boolean;
  is_public: boolean;
  custom_prompt: string;
  ai_model: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  emoji_avatar: '🤖',
  tone: 'friendly',
  traits: { creativity: 50, warmth: 60, directness: 50, humor: 40, formality: 40 },
  domains: [],
  memory_enabled: false,
  is_public: false,
  custom_prompt: '',
  ai_model: 'gemini-2.5-flash',
};

// ─── Slider Component ─────────────────────────────────────────────────────────

function PersonalitySlider({
  label, leftLabel, rightLabel, value, onChange,
}: { label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{leftLabel}</span>
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground">{rightLabel}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, hsl(var(--primary)/0.5), hsl(var(--primary)))',
          }}
        />
      </div>
      <input
        type="range"
        min={0} max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 opacity-0 absolute cursor-pointer"
        style={{ marginTop: '-24px', position: 'relative', zIndex: 10 }}
      />
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepIdentity({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Give your persona an identity</h2>
        <p className="text-sm text-muted-foreground">Start with a name, avatar, and brief description.</p>
      </div>

      {/* Emoji picker */}
      <div className="space-y-2">
        <Label className="text-sm font-normal">Avatar</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => update({ emoji_avatar: e })}
              className={cn(
                'h-10 w-10 rounded-xl text-xl transition-all border-2',
                form.emoji_avatar === e
                  ? 'border-primary bg-primary/10 scale-110'
                  : 'border-transparent bg-muted hover:border-border'
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          placeholder="e.g. Aria the Philosopher"
          value={form.name}
          onChange={e => update({ name: e.target.value })}
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc" className="text-sm font-normal">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          id="desc"
          placeholder="Briefly describe this persona's background, purpose, or vibe…"
          value={form.description}
          onChange={e => update({ description: e.target.value })}
          rows={3}
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-normal">AI Model</Label>
        <Select value={form.ai_model} onValueChange={v => update({ ai_model: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StepPersonality({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Dial in the personality</h2>
        <p className="text-sm text-muted-foreground">Adjust the sliders to shape how this persona thinks and speaks.</p>
      </div>

      <div className="space-y-5">
        {PERSONALITY_SLIDERS.map(s => (
          <PersonalitySlider
            key={s.key}
            label={s.label}
            leftLabel={s.left}
            rightLabel={s.right}
            value={form.traits[s.key] ?? 50}
            onChange={v => update({ traits: { ...form.traits, [s.key]: v } })}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-normal">Tone</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TONES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ tone: t.value })}
              className={cn(
                'flex items-start gap-2 p-3 rounded-xl border text-left transition-all',
                form.tone === t.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-accent'
              )}
            >
              <span className="text-lg shrink-0">{t.emoji}</span>
              <div>
                <p className={cn('text-xs font-semibold', form.tone === t.value ? 'text-primary' : 'text-foreground')}>{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepKnowledge({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  const toggle = (d: string) => {
    update({ domains: form.domains.includes(d) ? form.domains.filter(x => x !== d) : [...form.domains, d] });
  };
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Knowledge domains</h2>
        <p className="text-sm text-muted-foreground">Select all areas this persona is expert in. Pick as many as fit.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              form.domains.includes(d)
                ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                : 'bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            {d}
          </button>
        ))}
      </div>
      {form.domains.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="text-foreground font-medium">{form.domains.join(', ')}</span>
        </p>
      )}
    </div>
  );
}

function StepBehavior({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Behavior & visibility</h2>
        <p className="text-sm text-muted-foreground">Fine-tune how this persona behaves and who can access it.</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3">
          <MemoryStick className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Memory</p>
            <p className="text-xs text-muted-foreground">Remembers past conversations with each user.</p>
          </div>
        </div>
        <Switch checked={form.memory_enabled} onCheckedChange={v => update({ memory_enabled: v })} />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Public gallery</p>
            <p className="text-xs text-muted-foreground">Visible in the public persona gallery. Anyone can talk to it.</p>
          </div>
        </div>
        <Switch checked={form.is_public} onCheckedChange={v => update({ is_public: v })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom" className="text-sm font-normal flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
          Custom system prompt additions <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          id="custom"
          placeholder="Add any extra instructions, constraints, or backstory…"
          value={form.custom_prompt}
          onChange={e => update({ custom_prompt: e.target.value })}
          rows={4}
          maxLength={800}
        />
        <p className="text-[11px] text-muted-foreground">This appends to the auto-generated system prompt.</p>
      </div>
    </div>
  );
}

function StepFinish({ form }: { form: FormState }) {
  const preview = buildSystemPrompt(form);
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Review your persona</h2>
        <p className="text-sm text-muted-foreground">This is how Forge will introduce your persona to the AI.</p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <span className="text-3xl">{form.emoji_avatar}</span>
        <div>
          <p className="font-bold text-lg">{form.name || 'Unnamed Persona'}</p>
          <p className="text-xs text-muted-foreground">{form.description || 'No description'}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          {form.is_public && <span className="forge-tag forge-tag-violet">Public</span>}
          {form.memory_enabled && <span className="forge-tag forge-tag-green">Memory</span>}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Generated System Prompt</p>
        <div className="rounded-xl bg-muted/60 border border-border p-3 text-xs text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {preview}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PersonaFormPage() {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(personaId);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && personaId) loadPersona(personaId);
  }, [personaId]);

  const loadPersona = async (id: string) => {
    const { data } = await supabase.from('personas').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const p = data as Persona;
    setForm({
      name: p.name ?? '',
      description: p.description ?? '',
      emoji_avatar: p.emoji_avatar ?? '🤖',
      tone: p.tone ?? 'friendly',
      traits: (p.personality_traits as Record<string, number>) ?? DEFAULT_FORM.traits,
      domains: p.knowledge_domain ? p.knowledge_domain.split(',').map(s => s.trim()).filter(Boolean) : [],
      memory_enabled: p.memory_enabled ?? false,
      is_public: p.is_public ?? false,
      custom_prompt: p.prompt_core_personality ?? '',
      ai_model: p.ai_model ?? 'gemini-2.5-flash',
    });
  };

  const update = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const canNext = () => {
    if (step === 1) return form.name.trim().length > 0;
    return true;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const systemPrompt = buildSystemPrompt(form);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        emoji_avatar: form.emoji_avatar,
        tone: form.tone,
        personality_traits: form.traits,
        knowledge_domain: form.domains.join(', '),
        memory_enabled: form.memory_enabled,
        is_public: form.is_public,
        system_prompt: systemPrompt,
        ai_model: form.ai_model,
        prompt_core_personality: form.custom_prompt || null,
        personality_profile: `${form.tone} | ${form.domains.join(', ')}`,
        emotional_state: 'neutral',
      };

      if (isEdit && personaId) {
        const { error } = await supabase.from('personas').update(payload).eq('id', personaId);
        if (error) throw error;
        toast.success('Persona updated!');
      } else {
        const { error } = await supabase.from('personas').insert(payload);
        if (error) throw error;
        toast.success('Persona created!');
      }
      navigate('/personas');
    } catch (err: unknown) {
      toast.error('Failed to save', { description: err instanceof Error ? err.message : '' });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepIdentity form={form} update={update} />;
      case 2: return <StepPersonality form={form} update={update} />;
      case 3: return <StepKnowledge form={form} update={update} />;
      case 4: return <StepBehavior form={form} update={update} />;
      case 5: return <StepFinish form={form} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/personas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-bold truncate flex-1">{isEdit ? 'Edit Persona' : 'Create Persona'}</h1>
          <span className="text-xs text-muted-foreground shrink-0">{step} / {STEPS.length}</span>
        </div>

        {/* Step progress bar */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => { if (s.id < step || (s.id === step + 1 && canNext())) setStep(s.id); }}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] font-medium transition-colors',
                    step === s.id ? 'text-primary' : s.id < step ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  <span className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                    step === s.id ? 'bg-primary text-primary-foreground border-primary' :
                    s.id < step ? 'bg-success text-success-foreground border-success' :
                    'bg-muted text-muted-foreground border-border'
                  )}>
                    {s.id < step ? <Check className="h-2.5 w-2.5" /> : s.id}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-px transition-all', s.id < step ? 'bg-success' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {renderStep()}

        {/* Navigation */}
        <div className="flex gap-3 pt-8 mt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step === 1 ? navigate('/personas') : setStep(s => s - 1)}
            className="flex-1"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1"
            >
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Persona'}
              {!saving && <Sparkles className="h-4 w-4 ml-1.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
