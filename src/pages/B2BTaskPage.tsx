import { useState } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Code, Megaphone, Terminal, FileCode2, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TASK_TEMPLATES = [
  { id: 'bug_fixer', icon: <Code className="w-5 h-5" />, title: 'Bug & Review Fixer', desc: 'Converts bad reviews into tickets & patches' },
  { id: 'marketing', icon: <Megaphone className="w-5 h-5" />, title: 'Marketing Optimizer', desc: 'Generates variants & A/B testing plans' },
  { id: 'code_optimizer', icon: <Terminal className="w-5 h-5" />, title: 'Code Architect', desc: 'Refactors code & flags security issues' },
];

export default function B2BTaskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState('bug_fixer');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleExecute = async () => {
    if (!user) {
      toast.error('You must be logged in');
      navigate('/login');
      return;
    }
    if (!input.trim()) {
      toast.error('Please provide some input text');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('execute_b2b_task', {
        body: { taskType, input }
      });

      if (error) {
        if (error.context?.status === 402) {
           toast.error('Insufficient Credits', { description: 'This task costs 5 credits. Please top up.' });
           return;
        }
        throw new Error(await error.context?.text?.() || error.message);
      }

      setResult(data);
      toast.success('Task Executed successfully (-5 credits)');
    } catch (err: any) {
      toast.error('Execution Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-5xl px-4 py-8 md:py-12 space-y-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Briefcase className="w-4 h-4" /> B2B Execution Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Structured Output Generation</h1>
          <p className="text-muted-foreground">
            Stop chatting, start building. Convert raw inputs (reviews, code, copy) directly into structured, executable JSON objects containing tickets, patches, and action plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TASK_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTaskType(t.id); setResult(null); }}
              className={cn(
                "forge-card p-5 text-left transition-all duration-200 border-2",
                taskType === t.id ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.15)] scale-[1.02]" : "border-transparent hover:border-border"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", taskType === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                {t.icon}
              </div>
              <h3 className="font-bold mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="forge-card p-4 md:p-6 mb-8 flex flex-col">
          <label className="font-semibold mb-2 flex items-center gap-2">
            Raw Input <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded bg-muted">5 credits / execution</span>
          </label>
          <textarea
            className="w-full min-h-[160px] p-4 bg-background border rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono mb-4"
            placeholder={
              taskType === 'bug_fixer' ? "Paste a bad app review or crash log here..." :
              taskType === 'marketing' ? "Paste raw product descriptions or features..." :
              "Paste messy code snippet here..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button 
            onClick={handleExecute} 
            disabled={loading}
            className="w-full md:w-auto self-end h-11 px-8 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Pipeline...</> : 'Execute Task Pipeline'}
          </Button>
        </div>

        {/* Results Area */}
        {result && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-2xl font-bold flex items-center gap-2 border-b pb-4">
              <Target className="w-6 h-6 text-success" /> Executable Deliverables
            </h2>
            
            {/* Bug Fixer Render */}
            {taskType === 'bug_fixer' && result.tickets && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Tickets</h3>
                  {result.tickets.map((t: any, i: number) => (
                    <div key={i} className="forge-card p-4 border-l-4 border-l-destructive">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm">{t.title}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-destructive/10 text-destructive">{t.priority}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><FileCode2 className="w-5 h-5 text-primary" /> Code Patches</h3>
                  {result.patches?.map((p: any, i: number) => (
                    <div key={i} className="forge-card overflow-hidden">
                      <div className="bg-muted px-4 py-2 border-b text-xs font-mono font-bold">{p.file_path}</div>
                      <div className="p-4 bg-zinc-950 text-zinc-50 text-xs font-mono overflow-x-auto">
                        <pre><code>{p.code}</code></pre>
                      </div>
                      <div className="p-3 text-xs text-muted-foreground bg-muted/30 border-t">
                        <span className="font-semibold">Context:</span> {p.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback RAW JSON Renderer if structured rendering doesn't match */}
            {(!result.tickets && !result.variants && !result.refactored_code) && (
              <div className="forge-card overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b text-xs font-mono font-bold">RAW OUTPUT.json</div>
                <div className="p-4 bg-zinc-950 text-green-400 text-xs font-mono overflow-x-auto">
                  <pre><code>{JSON.stringify(result, null, 2)}</code></pre>
                </div>
              </div>
            )}
            
            {/* Catch-all for others (marketing / code optimizer) to just dump nice JSON for now */}
            {(result.variants || result.refactored_code) && (
               <div className="forge-card overflow-hidden">
                 <div className="bg-muted px-4 py-2 border-b text-xs font-mono font-bold">Generated Payload (Ready for API Integration)</div>
                 <div className="p-4 bg-zinc-950 text-zinc-50 text-xs font-mono overflow-x-auto">
                   <pre><code>{JSON.stringify(result, null, 2)}</code></pre>
                 </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}