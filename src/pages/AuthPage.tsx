import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Eye, EyeOff, Bot, Sparkles, Users, Layers,
  CheckCircle2, XCircle, ArrowRight, Loader2, Lock, User,
} from 'lucide-react';

// ── Password strength engine ──────────────────────────────────────────────────

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: { label: string; pass: boolean }[];
}

function analyzePassword(pw: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters',       pass: pw.length >= 8 },
    { label: 'Contains a number',            pass: /\d/.test(pw) },
    { label: 'Contains a letter',            pass: /[a-zA-Z]/.test(pw) },
    { label: 'Contains a special character', pass: /[^a-zA-Z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.pass).length as 0 | 1 | 2 | 3 | 4;
  const levels: Record<number, { label: string; color: string }> = {
    0: { label: 'Too short',  color: 'bg-muted' },
    1: { label: 'Weak',       color: 'bg-destructive' },
    2: { label: 'Fair',       color: 'bg-warning' },
    3: { label: 'Good',       color: 'bg-info' },
    4: { label: 'Strong',     color: 'bg-success' },
  };
  return { score, ...levels[score], checks };
}

// ── Strength meter bar ────────────────────────────────────────────────────────

function StrengthMeter({ pw, show }: { pw: string; show: boolean }) {
  const result = analyzePassword(pw);
  if (!show || pw.length === 0) return null;
  return (
    <div className="space-y-2 pt-1">
      {/* Segmented bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i <= result.score ? result.color : 'bg-border',
            )}
          />
        ))}
      </div>
      {/* Label */}
      <p className={cn(
        'text-xs font-medium transition-colors',
        result.score <= 1 ? 'text-destructive' :
        result.score === 2 ? 'text-warning' :
        result.score === 3 ? 'text-info' : 'text-success',
      )}>
        {result.label}
      </p>
      {/* Check list */}
      <ul className="space-y-1">
        {result.checks.map(c => (
          <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
            {c.pass
              ? <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              : <XCircle     className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
            <span className={c.pass ? 'text-foreground/80' : 'text-muted-foreground/60'}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Feature pill ──────────────────────────────────────────────────────────────

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary/90">
      {icon}
      {label}
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────

export default function AuthPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, signInWithUsername, signUpWithUsername } = useAuth();

  const [mode, setMode]             = useState<'login' | 'register'>('login');
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showCPw, setShowCPw]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<{ username?: string; password?: string; confirm?: string }>({});
  const [focusPw, setFocusPw]       = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/';

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  // Clear errors when switching mode
  useEffect(() => {
    setErrors({});
    setPassword('');
    setConfirmPw('');
  }, [mode]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!username.trim()) {
      e.username = 'Username is required';
    } else if (username.trim().length < 3) {
      e.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      e.username = 'Only letters, numbers, and underscores allowed';
    }

    if (!password) {
      e.password = 'Password is required';
    } else if (mode === 'register') {
      const { score } = analyzePassword(password);
      if (score < 2) e.password = 'Password is too weak — add numbers or special characters';
      if (password !== confirmPw) e.confirm = 'Passwords do not match';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithUsername(username.trim(), password);
        if (error) {
          if (error.message.toLowerCase().includes('invalid')) {
            setErrors({ password: 'Invalid username or password' });
          } else {
            setErrors({ password: error.message });
          }
          return;
        }
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      } else {
        const { error } = await signUpWithUsername(username.trim(), password);
        if (error) {
          if (error.message.includes('already')) {
            setErrors({ username: 'Username already taken' });
          } else {
            setErrors({ password: error.message });
          }
          return;
        }
        toast.success('Account created! Welcome to Forge.');
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel — branding (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, hsl(240 14% 6%), hsl(262 60% 10%), hsl(240 14% 8%))' }}>

        {/* Decorative glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(262 90% 66%), transparent)' }} />
        <div className="absolute bottom-1/3 right-0 w-48 h-48 rounded-full opacity-15 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(316 70% 52%), transparent)' }} />

        {/* Top: logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">Forge</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                bg-primary/20 text-primary/80 border border-primary/20">Beta</span>
            </div>
          </div>
        </div>

        {/* Middle: headline + features */}
        <div className="relative z-10 px-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-white leading-tight text-balance">
              Not just another AI chat.{' '}
              <span className="gradient-text">A whole different dimension.</span>
            </h2>
            <p className="text-sm text-white/60 text-pretty leading-relaxed max-w-sm">
              Build custom AI personas with deep memory. Run multi-agent pipelines.
              Watch 3 AI perspectives debate your ideas in real time.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            <FeaturePill icon={<Bot className="h-3.5 w-3.5" />}           label="Custom Personas" />
            <FeaturePill icon={<Users className="h-3.5 w-3.5" />}         label="3-Way Debate" />
            <FeaturePill icon={<Layers className="h-3.5 w-3.5" />}        label="Agent Pipelines" />
            <FeaturePill icon={<Sparkles className="h-3.5 w-3.5" />}      label="Persistent Memory" />
          </div>

          {/* Comparison vs AI Fiesta */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">What makes us different</p>
            <div className="space-y-2 text-sm">
              {[
                { us: 'Personas with memory & personality',      them: 'Generic model switching' },
                { us: '3 AI viewpoints debating simultaneously', them: 'One response at a time' },
                { us: 'Chain agents into smart pipelines',       them: 'No automation' },
                { us: 'Your AI learns your preferences',         them: 'Stateless conversations' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white/80">{r.us}</span>
                    <span className="text-white/30 text-[11px] block">{r.them}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: testimonial */}
        <div className="relative z-10 p-10">
          <blockquote className="text-sm text-white/50 italic leading-relaxed">
            "Finally — an AI chat that has an actual personality and remembers me."
          </blockquote>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/40 flex items-center justify-center text-[10px] font-bold text-white">F</div>
            <span className="text-xs text-white/30">Forge Beta user</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[400px] space-y-6">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden mb-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">Forge</span>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              {mode === 'login' ? 'Welcome back' : 'Join Forge'}
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              {mode === 'login'
                ? 'Sign in to your account to continue'
                : 'Create your account — it\'s free to start'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-normal text-muted-foreground block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete={mode === 'login' ? 'username' : 'new-password'}
                  placeholder="your_username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
                  className={cn(
                    'pl-9',
                    errors.username && 'border-destructive focus-visible:ring-destructive/30',
                  )}
                  disabled={loading}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3 shrink-0" />{errors.username}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-normal text-muted-foreground block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? '••••••••' : 'Create a strong password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  onFocus={() => setFocusPw(true)}
                  onBlur={() => setFocusPw(false)}
                  className={cn(
                    'pl-9 pr-10',
                    errors.password && 'border-destructive focus-visible:ring-destructive/30',
                  )}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3 shrink-0" />{errors.password}
                </p>
              )}
              {/* Strength meter — register only */}
              {mode === 'register' && (
                <StrengthMeter pw={password} show={focusPw || password.length > 0} />
              )}
            </div>

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-sm font-normal text-muted-foreground block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirm-password"
                    type={showCPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
                    className={cn(
                      'pl-9 pr-10',
                      errors.confirm && 'border-destructive focus-visible:ring-destructive/30',
                      !errors.confirm && confirmPw && confirmPw === password && 'border-success focus-visible:ring-success/30',
                    )}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3 shrink-0" />{errors.confirm}
                  </p>
                ) : confirmPw && confirmPw === password ? (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />Passwords match
                  </p>
                ) : null}
              </div>
            )}

            {/* Terms — register only */}
            {mode === 'register' && (
              <p className="text-xs text-muted-foreground text-pretty">
                By creating an account you agree to our{' '}
                <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>
                {' '}and{' '}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full gap-2 h-11" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight className="h-4 w-4" /></>
              }
            </Button>
          </form>

          {/* Switch mode */}
          <p className="text-sm text-center text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary font-medium hover:underline underline-offset-2"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {/* Continue as guest */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Continue as Guest
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
