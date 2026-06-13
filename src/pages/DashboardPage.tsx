import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Users, Layers, Bot, ArrowRight, Plus,
  Hash, ChevronRight, LogIn, UserPlus,
  Moon, Sun, Settings, Key, CheckCircle2, Lock, Coins, Briefcase
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { chatService } from '@/services/chat.service';
import OnboardingModal, { useOnboarding } from '@/components/onboarding/OnboardingModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub, color, onClick }: {
  label: string; value: string | number; icon: React.ReactNode;
  sub?: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      className={cn('forge-card p-5 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200', onClick && 'cursor-pointer')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Quick-start card ──────────────────────────────────────────────────────────

function QuickCard({
  icon, title, description, badge, cta, gradient, onClick,
}: {
  icon: React.ReactNode; title: string; description: string;
  badge?: string; cta: string; gradient: string; onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="group forge-card p-5 cursor-pointer hover:border-primary/40 hover:-translate-y-1 transition-all duration-200 flex flex-col h-full"
    >
      {/* Icon */}
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-4 shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-200"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      {/* Badge */}
      {badge && (
        <span className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 mb-2">
          {badge}
        </span>
      )}
      <h3 className="font-bold text-base mb-1.5 text-balance">{title}</h3>
      <p className="text-sm text-muted-foreground text-pretty leading-relaxed flex-1">{description}</p>
      <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}



// ═════════════════════════════════════════════════════════════════════════════
// Dashboard Page
// ═════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const navigate  = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isGuest = !user;
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('api_keys').select('id').eq('user_id', user.id).eq('provider', 'gemini').maybeSingle()
        .then(({ data }) => setHasGeminiKey(!!data));
    }
  }, [user]);

  const [stats, setStats] = useState({ conversations: 0, personas: 0, rooms: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  // Derive a display name: prefer username metadata, fallback to email prefix
  const displayName: string = (() => {
    if (!user) return '';
    const meta = user.user_metadata as Record<string, string> | undefined;
    return meta?.username ?? meta?.name ?? (user.email?.split('@')[0] ?? 'there');
  })();

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) { setLoadingStats(false); return; }
    try {
      const [convRes, personaRes, roomRes, creditRes] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('personas').select('id', { count: 'exact', head: true }),
        supabase.from('groups').select('id', { count: 'exact', head: true }),
        supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle()
      ]);
      setStats({
        conversations: convRes.count ?? 0,
        personas: personaRes.count ?? 0,
        rooms: roomRes.count ?? 0,
      });
      if (creditRes.data) {
        setCredits(creditRes.data.balance);
      } else {
        setCredits(0);
      }
    } catch {
      // silent — stats are best-effort
    } finally {
      setLoadingStats(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const conv = await chatService.createConversation('gemini-2.5-flash');
      navigate(`/chat/${conv.id}`);
    } catch {
      navigate('/chat');
    }
  };

  const QUICK_CARDS = [
    {
      icon: <Briefcase className="h-5 w-5" />,
      title: 'B2B Execution',
      description: 'Convert unstructured input into structured code patches, Jira tickets, and marketing variants.',
      badge: 'NEW',
      cta: 'Open Engine',
      gradient: 'linear-gradient(135deg, hsl(316 70% 52%), hsl(36 92% 48%))',
      onClick: () => navigate('/b2b'),
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Group Chat',
      description: 'Up to 6 AI personas debate in real time — each reacting to the others. Side-by-side perspective grid included.',
      badge: 'UNIQUE',
      cta: 'Start debate',
      gradient: 'linear-gradient(135deg, hsl(205 82% 52%), hsl(262 83% 58%))',
      onClick: () => navigate('/group-chat'),
    },
    {
      icon: <Layers className="h-5 w-5" />,
      title: 'Agent Studio',
      description: 'Build automated AI pipelines. Sequential, Roundtable, Swarm, or Story Chain — 4 collaboration modes.',
      cta: 'Open Studio',
      gradient: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))',
      onClick: () => navigate('/studio'),
    },
    {
      icon: <Hash className="h-5 w-5" />,
      title: 'Debate Rooms',
      description: 'Public and private real-time rooms with AI fact-checking. Join or host your own topic.',
      cta: 'Browse rooms',
      gradient: 'linear-gradient(135deg, hsl(152 68% 38%), hsl(205 82% 52%))',
      onClick: () => navigate('/rooms'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden dashboard-hero border-b border-border">
        <div className="absolute inset-0 dashboard-grid-bg opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14 space-y-6">
          
          {/* Out of Credits / Missing API Key Warning */}
          {hasGeminiKey === false && credits !== null && credits <= 0 && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>You are out of credits! Either upgrade your plan or add your own API Key to continue chatting.</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/credits')} className="border-destructive/20 hover:bg-destructive/20">
                    Get Credits
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="border-destructive/20 hover:bg-destructive/20">
                    Add API Key
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {/* Logo + brand */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}
                >
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight">Forge</span>
                  <span className="badge-beta">Beta</span>
                </div>
              </div>

              {/* Personalised greeting */}
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance mb-3">
                {isGuest
                  ? 'Your AI Command Center'
                  : `Welcome back, ${displayName} 👋`}
              </h1>
              <p className="text-base text-muted-foreground text-pretty max-w-lg">
                {isGuest
                  ? 'Build personas. Run multi-agent debates. Create pipelines. Everything AI Fiesta can\'t do.'
                  : 'Chat, debate, automate. Build AI personas, run agent pipelines, and host real-time group debates — all in one place.'}
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                {isGuest ? (
                  <>
                    <Button onClick={() => navigate('/login', { state: { from: '/' } })} className="gap-2 shadow-lg">
                      <LogIn className="h-4 w-4" />Sign In
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/login', { state: { from: '/' } })}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />Create Account
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleNewChat} className="gap-2 shadow-lg">
                      <Plus className="h-4 w-4" />New Chat
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/group-chat')} className="gap-2">
                      <Users className="h-4 w-4" />Group Debate
                      <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">UNIQUE</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Theme + Settings top-right */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {!isGuest && (
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Guest CTA banner ── */}
        {isGuest && (
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Lock className="h-4 w-4 text-primary shrink-0" />
                <p className="font-semibold text-sm">Sign in to unlock the full experience</p>
              </div>
              <p className="text-xs text-muted-foreground text-pretty max-w-lg">
                Guests can explore Forge, but your personas, chats, and pipelines won't be saved.
                Create a free account to keep everything — and get persistent AI memory.
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {[
                  'Persistent AI memory', 'Saved personas', 'Chat history',
                  'Agent pipelines', 'Debate sessions',
                ].map(f => (
                  <li key={f} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/login')}
                className="gap-1.5 h-9"
              >
                <LogIn className="h-3.5 w-3.5" />Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="gap-1.5 h-9"
              >
                <UserPlus className="h-3.5 w-3.5" />Register Free
              </Button>
            </div>
          </div>
        )}

        {/* ── Why Forge beats generic AI comparisons ── */}
        {isGuest && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Why Forge is different
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  color: '#7c3aed',
                  icon: '🧠',
                  title: 'Personalities, not models',
                  desc: 'Each persona has a unique character, backstory, and reasoning style — not just GPT vs Claude vs Gemini.',
                },
                {
                  color: '#0ea5e9',
                  icon: '💬',
                  title: 'Real debates, not comparisons',
                  desc: 'Personas read each other\'s responses and argue back. It\'s a panel discussion, not a side-by-side chart.',
                },
                {
                  color: '#10b981',
                  icon: '🔗',
                  title: 'Pipelines & automation',
                  desc: 'Chain AI agents sequentially. Build research pipelines, story chains, or swarms — no code required.',
                },
              ].map(item => (
                <div key={item.title} className="forge-card p-4 flex gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xl border"
                    style={{ borderColor: item.color + '40', background: item.color + '15' }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground text-pretty">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats row (logged-in only) ── */}
        {!isGuest && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Your Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {loadingStats ? (
                <>{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</>
              ) : (
                <>
                  <StatCard
                    label="Conversations"
                    value={stats.conversations}
                    icon={<MessageSquare className="h-5 w-5 text-white" />}
                    color="bg-primary/80"
                    sub="All-time total"
                  />
                  <StatCard
                    label="Personas"
                    value={stats.personas}
                    icon={<Bot className="h-5 w-5 text-white" />}
                    color="bg-chart-4/80"
                    sub="Created by you"
                  />
                  <StatCard
                    label="Debate Rooms"
                    value={stats.rooms}
                    icon={<Hash className="h-5 w-5 text-white" />}
                    color="bg-chart-2/80"
                    sub="Active rooms"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Quick-start cards ── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Launch a Feature</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_CARDS.map(c => (
              <QuickCard key={c.title} {...c} />
            ))}
          </div>
        </div>

        {/* ── Quick Access (logged-in only) ── */}
        {!isGuest && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Access</h2>
            <div className="forge-card divide-y divide-border">
              {[
                { icon: <Bot className="h-4 w-4" />,    label: 'My Personas',       path: '/personas',   badge: undefined },
                { icon: <Users className="h-4 w-4" />,   label: 'Group Chat',         path: '/group-chat', badge: 'UNIQUE' },
                { icon: <Layers className="h-4 w-4" />,  label: 'Pipeline Builder',   path: '/studio',     badge: undefined },
                { icon: <Hash className="h-4 w-4" />,    label: 'Debate Rooms',       path: '/rooms',      badge: undefined },
                { icon: <Key className="h-4 w-4" />,     label: 'Settings & API Keys', path: '/settings',  badge: undefined },
              ].map(item => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Forge — Multi-Persona AI Platform</span>
          <div className="flex items-center gap-4">
            {!isGuest && (
              <button type="button" className="hover:text-foreground" onClick={() => navigate('/settings')}>Settings</button>
            )}
            {isGuest && (
              <button type="button" className="hover:text-foreground text-primary font-medium" onClick={() => navigate('/login')}>
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
