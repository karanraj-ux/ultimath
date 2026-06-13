import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiKeyService } from '@/services/apikey.service';
import { chatService } from '@/services/chat.service';
import { pipelineService } from '@/services/pipeline.service';
import {
  CheckCircle2, XCircle, Loader2, AlertCircle,
  ArrowLeft, FlaskConical, Database, Key, MessageSquare, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TestResult {
  name: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

const INITIAL_TESTS: Omit<TestResult, 'status'>[] = [
  { name: 'Database Connection',   icon: <Database className="h-4 w-4" /> },
  { name: 'API Keys Table',         icon: <Key className="h-4 w-4" /> },
  { name: 'Conversations Table',    icon: <MessageSquare className="h-4 w-4" /> },
  { name: 'Messages Table',         icon: <MessageSquare className="h-4 w-4" /> },
  { name: 'Agent Pipelines Table',  icon: <Layers className="h-4 w-4" /> },
];

function TestRow({ test }: { test: TestResult }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
      test.status === 'success' ? 'border-[hsl(152_68%_44%/0.3)] bg-[hsl(152_68%_44%/0.04)]' :
      test.status === 'error'   ? 'border-destructive/30 bg-destructive/4' :
      test.status === 'running' ? 'border-primary/30 bg-primary/4' :
      'border-border bg-card/50',
    )}>
      <div className={cn(
        'shrink-0 transition-colors',
        test.status === 'success' ? 'text-[hsl(152_68%_44%)]' :
        test.status === 'error'   ? 'text-destructive' :
        test.status === 'running' ? 'text-primary' :
        'text-muted-foreground',
      )}>
        {test.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> :
         test.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
         test.status === 'error'   ? <XCircle className="h-4 w-4" /> :
         <div className="h-4 w-4 rounded-full border-2 border-current" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-muted-foreground shrink-0', test.status !== 'pending' && 'text-foreground/60')}>
            {test.icon}
          </span>
          <p className="font-medium text-sm">{test.name}</p>
        </div>
        {test.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{test.message}</p>}
      </div>
      <span className={cn(
        'text-xs font-semibold uppercase tracking-wide shrink-0',
        test.status === 'success' ? 'text-[hsl(152_68%_44%)]' :
        test.status === 'error'   ? 'text-destructive' :
        test.status === 'running' ? 'text-primary' :
        'text-muted-foreground',
      )}>
        {test.status}
      </span>
    </div>
  );
}

export default function SystemTestPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>(
    INITIAL_TESTS.map(t => ({ ...t, status: 'pending' })),
  );
  const [testApiKey, setTestApiKey] = useState('');
  const [testing, setTesting] = useState(false);

  const update = (i: number, status: TestResult['status'], message?: string) => {
    setTests(prev => prev.map((t, idx) => idx === i ? { ...t, status, message } : t));
  };

  const runTests = async () => {
    setTesting(true);
    setTests(prev => prev.map(t => ({ ...t, status: 'pending', message: undefined })));
    await new Promise(r => setTimeout(r, 100));

    // 0 – DB connection
    update(0, 'running');
    try {
      await apiKeyService.getAPIKeys();
      update(0, 'success', 'Connected successfully');
    } catch (e: unknown) { update(0, 'error', (e as Error).message); }

    // 1 – API keys table
    update(1, 'running');
    try {
      const k = await apiKeyService.createAPIKey('openai', `test-${Date.now()}`, false);
      await apiKeyService.deleteAPIKey(k.id);
      update(1, 'success', 'Read + write OK');
    } catch (e: unknown) { update(1, 'error', (e as Error).message); }

    // 2 – Conversations
    update(2, 'running');
    try {
      const c = await chatService.createConversation('gpt-4o-mini', '__test__');
      await chatService.deleteConversation(c.id);
      update(2, 'success', 'Create + delete OK');
    } catch (e: unknown) { update(2, 'error', (e as Error).message); }

    // 3 – Messages (depends on conversations)
    update(3, 'running');
    try {
      const c2 = await chatService.createConversation('gpt-4o-mini', '__msg_test__');
      await chatService.getMessages(c2.id);
      await chatService.deleteConversation(c2.id);
      update(3, 'success', 'Read OK');
    } catch (e: unknown) { update(3, 'error', (e as Error).message); }

    // 4 – Agent Pipelines
    update(4, 'running');
    try {
      const templates = await pipelineService.getTemplates();
      update(4, 'success', `${templates.length} built-in templates found`);
    } catch (e: unknown) { update(4, 'error', (e as Error).message); }

    setTesting(false);
  };

  const testAIConnection = async () => {
    if (!testApiKey.trim()) { toast.error('Enter an OpenAI API key first'); return; }
    try {
      const k = await apiKeyService.createAPIKey('openai', testApiKey, true);
      toast.info('Testing AI connection…');
      await chatService.sendChatMessage({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Reply with exactly: "Forge AI is live!"' }],
      });
      toast.success('AI is working!');
      await apiKeyService.deleteAPIKey(k.id);
    } catch (e: unknown) {
      toast.error('AI test failed: ' + (e as Error).message);
    }
  };

  const passCount = tests.filter(t => t.status === 'success').length;
  const failCount = tests.filter(t => t.status === 'error').length;
  const allDone   = tests.every(t => t.status === 'success' || t.status === 'error');

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FlaskConical className="h-4 w-4 text-primary shrink-0" />
          <h1 className="font-bold flex-1">System Health Check</h1>
          {allDone && tests.some(t => t.status !== 'pending') && (
            <span className={cn(
              'text-xs font-bold',
              failCount === 0 ? 'text-[hsl(152_68%_44%)]' : 'text-destructive',
            )}>
              {passCount}/{tests.length} passed
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Run tests card */}
        <div className="forge-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Database & Services</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Verify all tables and services are operational.</p>
            </div>
            <Button onClick={runTests} disabled={testing} className="gap-2 shrink-0">
              {testing ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : 'Run Tests'}
            </Button>
          </div>

          <div className="space-y-2">
            {tests.map((t, i) => <TestRow key={i} test={t} />)}
          </div>

          {allDone && failCount === 0 && tests[0].status !== 'pending' && (
            <div className="rounded-xl bg-[hsl(152_68%_44%/0.08)] border border-[hsl(152_68%_44%/0.25)] px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-[hsl(152_68%_44%)] shrink-0" />
              <p className="text-sm font-medium text-[hsl(152_68%_44%)]">All systems operational</p>
            </div>
          )}
        </div>

        {/* AI connection test */}
        <div className="forge-card p-6 space-y-4">
          <div>
            <h2 className="font-bold">Test Live AI Connection</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Temporarily add an OpenAI key, fire a test message, then auto-delete it.</p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your key is used for a single test call and immediately deleted. It is never stored permanently.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-normal text-muted-foreground block">OpenAI API Key</label>
            <Input
              type="password"
              value={testApiKey}
              onChange={e => setTestApiKey(e.target.value)}
              placeholder="sk-…"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Get your key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                className="text-primary underline underline-offset-2">
                platform.openai.com/api-keys
              </a>
            </p>
          </div>

          <Button onClick={testAIConnection} disabled={!testApiKey.trim()} className="w-full">
            Test AI Connection
          </Button>
        </div>

        {/* Next steps */}
        <div className="forge-card p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Next Steps
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              { label: 'Add real API keys',         href: '/settings' },
              { label: 'Start a new AI conversation', href: '/' },
              { label: 'Build a multi-agent pipeline', href: '/studio' },
              { label: 'Create a debate room',       href: '/rooms' },
            ].map(item => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex items-center gap-2 hover:text-primary transition-colors group"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0 group-hover:bg-primary" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

