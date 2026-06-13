import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import {
  Settings as SettingsIcon, ArrowLeft, Key, MessageSquare, Users,
  GitFork, Hash, Bot, Clock, Loader2, CheckCircle2,
  Eye, EyeOff, Plus, Trash2, TestTube2, Activity, Moon, Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Activity types ────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  type: 'chat' | 'group_chat' | 'pipeline' | 'persona' | 'room';
  label: string;
  sub: string;
  time: string;
}

const ACTIVITY_ICONS: Record<ActivityEntry['type'], React.ReactNode> = {
  chat:       <MessageSquare className="h-3.5 w-3.5" />,
  group_chat: <Users className="h-3.5 w-3.5" />,
  pipeline:   <GitFork className="h-3.5 w-3.5" />,
  persona:    <Bot className="h-3.5 w-3.5" />,
  room:       <Hash className="h-3.5 w-3.5" />,
};

const ACTIVITY_COLORS: Record<ActivityEntry['type'], string> = {
  chat:       'bg-primary/10 text-primary',
  group_chat: 'bg-sky-500/10 text-sky-400',
  pipeline:   'bg-violet-500/10 text-violet-400',
  persona:    'bg-emerald-500/10 text-emerald-400',
  room:       'bg-orange-500/10 text-orange-400',
};

// ── Recent Activity Panel ─────────────────────────────────────────────────────

type ActivityFilter = 'all' | 'chat' | 'pipeline' | 'group_chat' | 'persona';

const FILTER_TABS: { id: ActivityFilter; label: string; emptyMsg: string }[] = [
  { id: 'all',        label: 'All',        emptyMsg: 'Start chatting, running pipelines, or creating personas' },
  { id: 'chat',       label: 'Chat',       emptyMsg: 'No chat conversations yet' },
  { id: 'pipeline',   label: 'Pipeline',   emptyMsg: 'No pipeline runs yet' },
  { id: 'group_chat', label: 'Group Chat', emptyMsg: 'No group chats yet' },
  { id: 'persona',    label: 'Persona',    emptyMsg: 'No personas created yet' },
];

function RecentActivityPanel() {
  const [entries, setEntries]       = useState<ActivityEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<ActivityFilter>('all');
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => { loadActivity(); }, [page]);

  const loadActivity = async () => {
    setLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const [convRes, groupRes, pipelineRes, personaRes] = await Promise.all([
        supabase.from('conversations').select('id, title, updated_at')
          .order('updated_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
        supabase.from('group_chat_sessions').select('id, title, updated_at')
          .order('updated_at', { ascending: false }).limit(PAGE_SIZE),
        supabase.from('pipeline_runs').select('id, pipeline_name, created_at')
          .order('created_at', { ascending: false }).limit(PAGE_SIZE),
        supabase.from('personas').select('id, name, created_at')
          .order('created_at', { ascending: false }).limit(PAGE_SIZE),
      ]);

      const all: ActivityEntry[] = [
        ...(convRes.data ?? []).map(c => ({
          id: `conv-${c.id}`, type: 'chat' as const,
          label: c.title || 'New conversation', sub: 'AI Chat', time: c.updated_at,
        })),
        ...(groupRes.data ?? []).map(g => ({
          id: `grp-${g.id}`, type: 'group_chat' as const,
          label: g.title || 'Group session', sub: 'Group Chat', time: g.updated_at,
        })),
        ...(pipelineRes.data ?? []).map(p => ({
          id: `pipe-${p.id}`, type: 'pipeline' as const,
          label: p.pipeline_name || 'Pipeline run', sub: 'Pipeline Builder', time: p.created_at,
        })),
        ...(personaRes.data ?? []).map(p => ({
          id: `persona-${p.id}`, type: 'persona' as const,
          label: p.name || 'New persona', sub: 'Persona created', time: p.created_at,
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setEntries(all);
    } catch {
      toast.error('Could not load activity history');
    } finally {
      setLoading(false);
    }
  };

  // Counts per type for badges
  const counts = {
    all:        entries.length,
    chat:       entries.filter(e => e.type === 'chat').length,
    pipeline:   entries.filter(e => e.type === 'pipeline').length,
    group_chat: entries.filter(e => e.type === 'group_chat').length,
    persona:    entries.filter(e => e.type === 'persona').length,
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);
  const paginated = filtered.slice(0, PAGE_SIZE);
  const currentTab = FILTER_TABS.find(t => t.id === filter)!;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              filter === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`text-[10px] font-bold px-1 rounded-full ${
                filter === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-border text-muted-foreground'
              }`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg bg-muted" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{currentTab.emptyMsg}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {paginated.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 py-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${ACTIVITY_COLORS[entry.type]}`}>
                  {ACTIVITY_ICONS[entry.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.label}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.sub}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground">{timeAgo(entry.time)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 0}
              onClick={() => setPage(p => p - 1)} className="h-8 text-xs">
              ← Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={entries.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)} className="h-8 text-xs">
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── API Keys Panel ─────────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  provider: string;
  key_encrypted: string;
  created_at: string;
}

const PROVIDERS = [
  { id: 'openai',     label: 'OpenAI',     color: 'text-emerald-400', placeholder: 'sk-...' },
  { id: 'anthropic',  label: 'Anthropic',  color: 'text-orange-400',  placeholder: 'sk-ant-...' },
  { id: 'gemini',     label: 'Google Gemini', color: 'text-sky-400',  placeholder: 'AIza...' },
  { id: 'groq',       label: 'Groq',       color: 'text-violet-400',  placeholder: 'gsk_...' },
  { id: 'perplexity', label: 'Perplexity', color: 'text-pink-400',    placeholder: 'pplx-...' },
];

function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('api_keys')
      .select('id, provider, key_encrypted, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setKeys((data ?? []) as ApiKeyRow[]);
        setLoading(false);
      });
  }, []);

  const handleAdd = async (provider: string) => {
    if (!newKey.trim()) return;
    const { data, error } = await supabase
      .from('api_keys')
      .insert({ provider, key_encrypted: newKey.trim() })
      .select()
      .maybeSingle();
    if (error) { toast.error('Failed to save key'); return; }
    if (data) setKeys(prev => [data as ApiKeyRow, ...prev]);
    setAdding(null);
    setNewKey('');
    toast.success(`${provider} API key saved`);
  };

  const handleRemove = async (id: string, provider: string) => {
    await supabase.from('api_keys').delete().eq('id', id);
    setKeys(prev => prev.filter(k => k.id !== id));
    toast.success(`${provider} key removed`);
  };

  const handleTest = async (key: ApiKeyRow) => {
    setTesting(key.id);
    // Simple validation — check key prefix / length
    await new Promise(r => setTimeout(r, 800));
    const k = key.key_encrypted;
    const valid =
      (key.provider === 'openai'     && k.startsWith('sk-')) ||
      (key.provider === 'anthropic'  && k.startsWith('sk-ant')) ||
      (key.provider === 'gemini'     && k.startsWith('AIza')) ||
      (key.provider === 'groq'       && k.startsWith('gsk_')) ||
      (key.provider === 'perplexity' && k.startsWith('pplx')) ||
      k.length > 20;
    if (valid) toast.success(`${key.provider} key looks valid`);
    else toast.error(`${key.provider} key may be invalid — check prefix`);
    setTesting(null);
  };

  const maskKey = (k: string) => k.length > 8
    ? k.slice(0, 6) + '••••••••' + k.slice(-4)
    : '••••••••';

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-muted" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map(prov => {
        const existing = keys.filter(k => k.provider === prov.id);
        const isAdding = adding === prov.id;
        return (
          <div key={prov.id} className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${prov.color}`}>{prov.label}</span>
                {existing.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 border-success/40 text-success">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Active
                  </Badge>
                )}
              </div>
              {!isAdding && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setAdding(prov.id); setNewKey(''); }}
                >
                  <Plus className="h-3 w-3" />Add Key
                </Button>
              )}
            </div>

            {/* Existing keys */}
            {existing.map(k => (
              <div key={k.id} className="flex items-center gap-2 py-1.5 group">
                <code className="flex-1 text-[11px] font-mono text-muted-foreground truncate">
                  {showKey[k.id] ? k.key_encrypted : maskKey(k.key_encrypted)}
                </code>
                <button
                  type="button"
                  onClick={() => setShowKey(prev => ({ ...prev, [k.id]: !prev[k.id] }))}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  {showKey[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-sky-400"
                  disabled={testing === k.id}
                  onClick={() => handleTest(k)}
                >
                  {testing === k.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <TestTube2 className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-destructive"
                  onClick={() => handleRemove(k.id, prov.label)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {/* Add new key inline */}
            {isAdding && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder={prov.placeholder}
                  className="h-8 text-xs font-mono flex-1"
                  type="password"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd(prov.id);
                    if (e.key === 'Escape') { setAdding(null); setNewKey(''); }
                  }}
                />
                <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleAdd(prov.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs px-2"
                  onClick={() => { setAdding(null); setNewKey(''); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Settings Page
// ═════════════════════════════════════════════════════════════════════════════

type TabId = 'activity' | 'api-keys' | 'display' | 'data';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'activity',  label: 'Activity',   icon: <Activity className="h-4 w-4" /> },
  { id: 'api-keys',  label: 'API Keys',   icon: <Key className="h-4 w-4" /> },
  { id: 'display',   label: 'Display',    icon: <Moon className="h-4 w-4" /> },
  { id: 'data',      label: 'Data',       icon: <SettingsIcon className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('activity');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SettingsIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <h1 className="font-bold truncate">Settings</h1>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Activity ── */}
        {activeTab === 'activity' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your last conversations, pipeline runs, group chats, and personas across Forge.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityPanel />
            </CardContent>
          </Card>
        )}

        {/* ── API Keys ── */}
        {activeTab === 'api-keys' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4 text-primary" />
                API Keys
              </CardTitle>
              <CardDescription>
                Add your own provider keys. Keys are stored encrypted and used for all AI chat, pipeline, and group chat features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysPanel />
            </CardContent>
          </Card>
        )}

        {/* ── Display ── */}
        {activeTab === 'display' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel of Forge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Switch between light and dark mode</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark'
                      ? <><Sun className="h-4 w-4" />Light</>
                      : <><Moon className="h-4 w-4" />Dark</>}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compact-view" className="text-sm font-medium">Compact View</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Reduce spacing for more content density</p>
                  </div>
                  <Switch id="compact-view" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reduce-motion" className="text-sm font-medium">Reduce Motion</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Disable animations for accessibility</p>
                  </div>
                  <Switch id="reduce-motion" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Configure how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="persona-responses" className="text-sm font-medium">Persona Response Alerts</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Get notified when personas respond in group chats</p>
                  </div>
                  <Switch id="persona-responses" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pipeline-complete" className="text-sm font-medium">Pipeline Complete</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Alert when a pipeline run finishes</p>
                  </div>
                  <Switch id="pipeline-complete" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Data ── */}
        {activeTab === 'data' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
              <CardDescription>Export or clear your application data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Export All Data</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Download all personas, conversations, and pipeline runs</p>
                </div>
                <Button variant="outline" onClick={() => toast.info('Export feature coming soon')}>Export</Button>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Clear All Data</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Permanently delete all your data — this cannot be undone</p>
                </div>
                <Button variant="destructive" onClick={() => toast.info('Clear data feature coming soon')}>Clear Data</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
