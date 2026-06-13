import { useState, useCallback, useRef } from 'react';
import type { CollabMode, PipelineStep, PipelineSSEEvent, PipelineStepOutput } from '@/types/types';

// ── Per-step live state tracked during execution ───────────────────────────

export interface LiveStepState {
  step_index: number;
  agent_name: string;
  agent_emoji: string;
  role: string;
  status: 'pending' | 'running' | 'done' | 'error';
  /** Tokens accumulated so far (streaming) */
  partial_content: string;
  /** Full content once step completes */
  full_content: string;
  duration_ms?: number;
}

export interface UseAgentPipelineReturn {
  running: boolean;
  liveSteps: LiveStepState[];
  finalOutput: string;
  runId: string | null;
  error: string | null;
  completedSteps: PipelineStepOutput[];
  run: (params: {
    pipeline_id?: string;
    pipeline_name: string;
    input_prompt: string;
    steps: PipelineStep[];
    mode?: CollabMode;
    rounds?: number;
  }) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Build initial liveSteps. For roundtable we expand to rounds×steps + 1 synth slot. */
function buildInitialSteps(steps: PipelineStep[], mode: CollabMode, rounds: number): LiveStepState[] {
  if (mode === 'roundtable') {
    const expanded: LiveStepState[] = [];
    for (let r = 0; r < rounds; r++) {
      for (const s of steps) {
        expanded.push({
          step_index: r * steps.length + s.step_index,
          agent_name: s.persona_name,
          agent_emoji: s.persona_emoji,
          role: `Round ${r + 1} · ${s.role}`,
          status: 'pending',
          partial_content: '',
          full_content: '',
        });
      }
    }
    // synthesis slot
    expanded.push({
      step_index: rounds * steps.length,
      agent_name: '⚡ Synthesis',
      agent_emoji: '⚡',
      role: 'Roundtable Summary',
      status: 'pending',
      partial_content: '',
      full_content: '',
    });
    return expanded;
  }

  if (mode === 'swarm') {
    return [
      ...steps.map((s) => ({
        step_index: s.step_index,
        agent_name: s.persona_name,
        agent_emoji: s.persona_emoji,
        role: s.role,
        status: 'pending' as const,
        partial_content: '',
        full_content: '',
      })),
      // synthesis slot
      {
        step_index: steps.length,
        agent_name: '🌀 Master Synthesis',
        agent_emoji: '🌀',
        role: 'Swarm Synthesizer',
        status: 'pending' as const,
        partial_content: '',
        full_content: '',
      },
    ];
  }

  // sequential + story: simple 1:1 mapping
  return steps.map((s) => ({
    step_index: s.step_index,
    agent_name: s.persona_name,
    agent_emoji: s.persona_emoji,
    role: s.role,
    status: 'pending' as const,
    partial_content: '',
    full_content: '',
  }));
}

export function useAgentPipeline(): UseAgentPipelineReturn {
  const [running, setRunning] = useState(false);
  const [liveSteps, setLiveSteps] = useState<LiveStepState[]>([]);
  const [finalOutput, setFinalOutput] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<PipelineStepOutput[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setLiveSteps([]);
    setFinalOutput('');
    setRunId(null);
    setError(null);
    setCompletedSteps([]);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const run = useCallback(async ({
    pipeline_id,
    pipeline_name,
    input_prompt,
    steps,
    mode = 'sequential',
    rounds = 2,
  }: {
    pipeline_id?: string;
    pipeline_name: string;
    input_prompt: string;
    steps: PipelineStep[];
    mode?: CollabMode;
    rounds?: number;
  }) => {
    reset();
    setRunning(true);

    // Initialise all step states as pending (expanded for multi-round modes)
    setLiveSteps(buildInitialSteps(steps, mode, rounds));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/run-pipeline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ pipeline_id, pipeline_name, input_prompt, steps, mode, rounds }),
          signal: ctrl.signal,
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          let evt: PipelineSSEEvent;
          try { evt = JSON.parse(payload); } catch { continue; }

          switch (evt.type) {
            case 'swarm_start':
              // Swarm agents already initialized; nothing extra needed
              break;

            case 'step_start':
              setLiveSteps(prev => {
                const exists = prev.some(s => s.step_index === evt.step);
                if (exists) {
                  return prev.map(s =>
                    s.step_index === evt.step
                      ? { ...s, status: 'running', agent_name: evt.agent_name, agent_emoji: evt.agent_emoji, role: evt.role }
                      : s,
                  );
                }
                // Dynamically add unseen step (e.g. synthesis slot)
                return [...prev, {
                  step_index: evt.step,
                  agent_name: evt.agent_name,
                  agent_emoji: evt.agent_emoji,
                  role: evt.role,
                  status: 'running' as const,
                  partial_content: '',
                  full_content: '',
                }];
              });
              break;

            case 'token':
              setLiveSteps(prev => prev.map(s =>
                s.step_index === evt.step
                  ? { ...s, partial_content: s.partial_content + evt.content }
                  : s,
              ));
              break;

            case 'step_done':
              setLiveSteps(prev => prev.map(s =>
                s.step_index === evt.step
                  ? { ...s, status: 'done', full_content: evt.full_content, partial_content: '', duration_ms: evt.duration_ms }
                  : s,
              ));
              setCompletedSteps(prev => {
                const existing = prev.find(p => p.step_index === evt.step);
                if (existing) return prev;
                return [...prev, {
                  step_index: evt.step,
                  agent_name: '',
                  agent_emoji: '',
                  role: '',
                  content: evt.full_content,
                  model: '',
                  duration_ms: evt.duration_ms,
                }];
              });
              break;

            case 'pipeline_done':
              setFinalOutput(evt.final_output);
              setRunId(evt.run_id);
              setRunning(false);
              break;

            case 'error':
              setError(evt.message);
              setRunning(false);
              setLiveSteps(prev => prev.map(s =>
                s.status === 'running' ? { ...s, status: 'error' } : s,
              ));
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setError(String(err));
      setRunning(false);
    }
  }, [reset]);

  return { running, liveSteps, finalOutput, runId, error, completedSteps, run, reset, abort };
}

