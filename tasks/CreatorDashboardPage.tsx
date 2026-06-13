import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { PersonaStatSummary } from '@/types/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Eye, MessageSquare, Users, Sparkles,
  Globe, Lock, Plus, Copy, TrendingUp, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="forge-card p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Persona Row ──────────────────────────────────────────────────────────────

function PersonaRow({ stat, onEdit, onCopyLink }: {
  stat: PersonaStatSummary;
  onEdit: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/30 transition-colors group">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
        {stat.emoji_avatar ?? '🤖'}
      </div>

      {/* Name + visibility */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{stat.name}</p>
          {stat.is_public
            ? <Globe className="h-3 w-3 text-emerald-400 shrink-0" />
            : <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(stat.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5 min-w-[52px]">
          <Eye className="h-3.5 w-3.5 text-primary/60" />
          <span className="font-medium text-foreground">{(stat.total_views ?? 0).toLocaleString()}</span>
          views
        </span>
        <span className="flex items-center gap-1.5 min-w-[52px]">
          <MessageSquare className="h-3.5 w-3.5 text-primary/60" />
          <span className="font-medium text-foreground">{(stat.total_chats ?? 0).toLocaleString()}</span>
          chats
        </span>
        <span className="flex items-center gap-1.5 min-w-[64px]">
          <Users className="h-3.5 w-3.5 text-primary/60" />
          <span className="font-medium text-foreground">{(stat.unique_visitors ?? 0).toLocaleString()}</span>
          visitors
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {stat.is_public && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopyLink} title="Copy shareable link">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit persona">
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<PersonaStatSummary[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadStats(); }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [summaryRes, chartRes] = await Promise.all([
        supabase.from('persona_stat_summary').select('*').order('total_views', { ascending: false }),
        supabase.rpc('get_creator_analytics', { p_creator_id: user.id, p_days: 14 })
      ]);
      
      if (summaryRes.error) throw summaryRes.error;
      setStats(Array.isArray(summaryRes.data) ? summaryRes.data as PersonaStatSummary[] : []);

      if (chartRes.data) {
        setChartData(chartRes.data);
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const totals = stats.reduce(
    (acc, s) => ({
      views: acc.views + (s.total_views ?? 0),
      chats: acc.chats + (s.total_chats ?? 0),
      visitors: acc.visitors + (s.unique_visitors ?? 0),
      messages: acc.messages + (s.total_messages ?? 0),
    }),
    { views: 0, chats: 0, visitors: 0, messages: 0 }
  );

  const copyLink = (personaId: string) => {
    const url = `${window.location.origin}/p/${personaId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!', { description: url });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky nav bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/personas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <h1 className="font-bold truncate">Creator Dashboard</h1>
          </div>
          <Button size="sm" onClick={() => navigate('/personas/create')} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            New Persona
          </Button>
        </div>
      </div>

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.12) 0%, hsl(316 70% 58% / 0.06) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.25) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-5 mb-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-150"
                style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
              <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.35)]"
                style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-balance">Creator Dashboard</h2>
                <span className="badge-beta">Beta</span>
              </div>
              <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                Track views, chats, and visitors across all your public personas.
              </p>
            </div>
          </div>

          {/* Hero stats strip */}
          {!loading && stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Eye className="h-4 w-4" />}          label="Total Views"      value={totals.views}    />
              <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Total Chats"     value={totals.chats}    />
              <StatCard icon={<Users className="h-4 w-4" />}         label="Unique Visitors" value={totals.visitors} />
              <StatCard icon={<Sparkles className="h-4 w-4" />}      label="Messages Sent"   value={totals.messages} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Analytics Chart */}
        <div className="forge-card overflow-hidden animate-fade-up">
          <div className="px-4 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Engagement (Last 14 Days)</h2>
          </div>
          <div className="p-4 h-[300px] w-full min-w-0">
            {loading ? (
              <div className="w-full h-full bg-muted/30 animate-pulse rounded-xl" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262 90% 66%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(262 90% 66%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(316 70% 58%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(316 70% 58%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                  />
                  <Area type="monotone" dataKey="views" name="Views" stroke="hsl(316 70% 58%)" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area type="monotone" dataKey="chats" name="Chats" stroke="hsl(262 90% 66%)" fillOpacity={1} fill="url(#colorChats)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No data for the selected period
              </div>
            )}
          </div>
        </div>

        {/* Persona table */}
        <div className="forge-card overflow-hidden animate-fade-up-delay-1">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Your Personas</h2>
            <span className="text-xs text-muted-foreground">{stats.length} total</span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="text-5xl mb-4">🤖</span>
              <p className="font-semibold mb-1">No personas yet</p>
              <p className="text-sm text-muted-foreground mb-5 text-pretty max-w-xs">
                Create your first persona and share it with the world.
              </p>
              <Button onClick={() => navigate('/personas/create')}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Create Persona
              </Button>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30">
                <div className="w-9 shrink-0" />
                <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Persona</div>
                <div className="flex items-center gap-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 pr-16">
                  <span className="min-w-[52px]">Views</span>
                  <span className="min-w-[52px]">Chats</span>
                  <span className="min-w-[64px]">Visitors</span>
                </div>
              </div>
              {stats.map(s => (
                <PersonaRow
                  key={s.persona_id}
                  stat={s}
                  onEdit={() => navigate(`/personas/edit/${s.persona_id}`)}
                  onCopyLink={() => copyLink(s.persona_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        {stats.length > 0 && (
          <div className={cn(
            'rounded-xl border border-border bg-card p-4 animate-fade-up-delay-2',
            'flex items-start gap-3'
          )}>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Grow your audience</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside text-pretty">
                <li>Make your persona public to appear in the gallery</li>
                <li>Share the persona link directly — no account needed to chat</li>
                <li>Add it to a Debate Room as an AI participant</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
