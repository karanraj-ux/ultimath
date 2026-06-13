import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, extractUserId } from '../_shared/cors.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineStepDef {
  step_index: number;
  persona_name: string;
  persona_emoji: string;
  role: string;
  instruction: string;
  model: string;
  system_prompt?: string;
}

/**
 * Collaboration modes:
 *  sequential – each agent hands off to the next (classic pipeline)
 *  roundtable – N rounds where ALL agents respond to each other
 *  swarm      – all agents run in parallel on same prompt, then a synthesizer merges
 *  story      – agents write alternating chapters of a narrative
 */
type CollabMode = 'sequential' | 'roundtable' | 'swarm' | 'story';

interface RunPipelineRequest {
  pipeline_id?: string;
  pipeline_name: string;
  input_prompt: string;
  steps: PipelineStepDef[];
  mode?: CollabMode;
  rounds?: number; // for roundtable (default 2)
}

// ── AI provider helpers ───────────────────────────────────────────────────────

function detectProvider(model: string): string {
  if (model.startsWith('gemini'))  return 'gemini';
  if (model.startsWith('claude'))  return 'claude';
  if (model.startsWith('llama') || model.startsWith('mixtral') || model.startsWith('gemma')) return 'groq';
  return 'openai';
}

async function callAI(
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  const provider = detectProvider(model);
  let fullContent = '';

  if (provider === 'openai' || provider === 'groq') {
    const baseUrl = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: allMessages, stream: true }),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const token = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content ?? '';
          if (token) { onToken(token); fullContent += token; }
        } catch { /* skip */ }
      }
    }
  } else if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
    const parts = [];
    if (systemPrompt) parts.push({ text: `[System]: ${systemPrompt}\n\n` });
    for (const m of messages) parts.push({ text: `[${m.role === 'user' ? 'User' : 'Assistant'}]: ${m.content}\n` });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      const matches = buf.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g);
      for (const m of matches) {
        const token = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        onToken(token); fullContent += token;
      }
      const lastBrace = buf.lastIndexOf('{');
      if (lastBrace > 0) buf = buf.slice(lastBrace);
    }
  } else if (provider === 'claude') {
    const convMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model, max_tokens: 8192, stream: true,
        system: systemPrompt || undefined,
        messages: convMsgs,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const token = JSON.parse(line.slice(6))?.delta?.text ?? '';
            if (token) { onToken(token); fullContent += token; }
          } catch { /* skip */ }
        }
      }
    }
  }

  return fullContent;
}

// ── Step output record ────────────────────────────────────────────────────────

interface StepOut {
  step_index: number;
  agent_name: string;
  agent_emoji: string;
  role: string;
  content: string;
  model: string;
  duration_ms: number;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const authResult = extractUserId(req);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult;

  try {
    const body: RunPipelineRequest = await req.json();
    const { pipeline_id, pipeline_name, input_prompt, steps, mode = 'sequential', rounds = 2 } = body;

    if (!steps?.length) {
      return new Response(JSON.stringify({ error: 'No steps provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pre-fetch API keys scoped to the requesting user
    const providers = [...new Set(steps.map(s => detectProvider(s.model)))];
    const apiKeyMap: Record<string, string> = {};
    for (const provider of providers) {
      let query = supabase
        .from('api_keys')
        .select('key_encrypted')
        .eq('provider', provider)
        .limit(1);
      if (userId) query = query.eq('user_id', userId);
      const { data } = await query;
      if (data?.[0]) apiKeyMap[provider] = data[0].key_encrypted;
    }

    // Create run record
    const { data: runRecord } = await supabase
      .from('pipeline_runs')
      .insert({
        pipeline_id: pipeline_id ?? null,
        pipeline_name,
        input_prompt,
        status: 'running',
        steps_output: [],
        final_output: '',
      })
      .select('id')
      .single();

    const runId = runRecord?.id ?? crypto.randomUUID();
    const enc = new TextEncoder();

    // ── SSE stream ────────────────────────────────────────────────────────────

    const stream = new ReadableStream({
      async start(controller) {
        const send = (evt: object) =>
          controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`));

        const checkKey = (step: PipelineStepDef): boolean => {
          const provider = detectProvider(step.model);
          if (!apiKeyMap[provider]) {
            send({ type: 'error', message: `No API key for ${provider} (${step.persona_name}). Add one in Settings → API Keys.` });
            controller.close();
            return false;
          }
          return true;
        };

        const runStep = async (step: PipelineStepDef, systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string> => {
          const provider = detectProvider(step.model);
          const apiKey = apiKeyMap[provider];
          send({ type: 'step_start', step: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role });
          const start = Date.now();
          const content = await callAI(step.model, apiKey, systemPrompt, messages, (token) => {
            send({ type: 'token', step: step.step_index, content: token });
          });
          send({ type: 'step_done', step: step.step_index, full_content: content, duration_ms: Date.now() - start });
          return content;
        };

        const stepsOutput: StepOut[] = [];
        let finalOutput = '';

        try {
          // ────────────────────────────────────────────────────────────────────
          // MODE: SEQUENTIAL — classic pipeline, each agent builds on the last
          // ────────────────────────────────────────────────────────────────────
          if (mode === 'sequential') {
            const history: Array<{ role: string; content: string }> = [{ role: 'user', content: input_prompt }];
            for (const step of steps) {
              if (!checkKey(step)) return;
              const prior = stepsOutput.map(s => `— ${s.agent_emoji} ${s.agent_name} (${s.role}):\n${s.content}`).join('\n\n');
              const sys = [
                step.system_prompt ?? '',
                `\nYour role: ${step.role}`,
                `Your task: ${step.instruction}`,
                prior ? `\nPrior agent work:\n${prior}\n\nBuild on it. Focus on your unique contribution.` : '',
              ].join('\n');
              const start = Date.now();
              send({ type: 'step_start', step: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role });
              const content = await callAI(step.model, apiKeyMap[detectProvider(step.model)], sys, history, (t) => send({ type: 'token', step: step.step_index, content: t }));
              const dur = Date.now() - start;
              stepsOutput.push({ step_index: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role, content, model: step.model, duration_ms: dur });
              history.push({ role: 'assistant', content: `[${step.persona_emoji} ${step.persona_name}]:\n${content}` });
              send({ type: 'step_done', step: step.step_index, full_content: content, duration_ms: dur });
              finalOutput = content;
            }
          }

          // ────────────────────────────────────────────────────────────────────
          // MODE: ROUNDTABLE — all agents speak in N rounds, reacting to each other
          // ────────────────────────────────────────────────────────────────────
          else if (mode === 'roundtable') {
            // Each agent gets a virtual step index offset by round
            const transcript: string[] = [];
            for (let round = 0; round < rounds; round++) {
              for (const step of steps) {
                if (!checkKey(step)) return;
                const virtualIdx = round * steps.length + step.step_index;
                const discussion = transcript.length > 0
                  ? `\n\nDiscussion so far:\n${transcript.join('\n\n')}`
                  : '';
                const isFirstSpeaker = transcript.length === 0;
                const sys = [
                  step.system_prompt ?? '',
                  `\nYou are ${step.persona_emoji} ${step.persona_name} — ${step.role}.`,
                  `Round ${round + 1} of ${rounds}. ${step.instruction}`,
                  isFirstSpeaker
                    ? '\nYou are opening the discussion. Make a compelling, insightful contribution.'
                    : `${discussion}\n\nReact to the conversation above. Agree, challenge, or add a genuinely new perspective. Be concise (2–4 paragraphs).`,
                ].join('\n');
                send({ type: 'step_start', step: virtualIdx, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: `Round ${round + 1} · ${step.role}` });
                const start = Date.now();
                const content = await callAI(step.model, apiKeyMap[detectProvider(step.model)], sys, [{ role: 'user', content: input_prompt }], (t) => send({ type: 'token', step: virtualIdx, content: t }));
                const dur = Date.now() - start;
                transcript.push(`**${step.persona_emoji} ${step.persona_name}** (Round ${round + 1}):\n${content}`);
                stepsOutput.push({ step_index: virtualIdx, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: `Round ${round + 1} · ${step.role}`, content, model: step.model, duration_ms: dur });
                send({ type: 'step_done', step: virtualIdx, full_content: content, duration_ms: dur });
              }
            }
            // Synthesise with the first step's model
            const synthStep = steps[0];
            if (checkKey(synthStep)) {
              const synthIdx = rounds * steps.length;
              const synthSys = `You are a neutral synthesis engine. Distill the roundtable discussion below into a coherent, structured conclusion. Highlight where agents agreed, where they diverged, and what the final recommended takeaway is.`;
              send({ type: 'step_start', step: synthIdx, agent_name: '⚡ Synthesis', agent_emoji: '⚡', role: 'Roundtable Summary' });
              const start = Date.now();
              finalOutput = await callAI(synthStep.model, apiKeyMap[detectProvider(synthStep.model)], synthSys, [{ role: 'user', content: `Topic: ${input_prompt}\n\nDiscussion:\n${transcript.join('\n\n')}` }], (t) => send({ type: 'token', step: synthIdx, content: t }));
              send({ type: 'step_done', step: synthIdx, full_content: finalOutput, duration_ms: Date.now() - start });
              stepsOutput.push({ step_index: synthIdx, agent_name: '⚡ Synthesis', agent_emoji: '⚡', role: 'Roundtable Summary', content: finalOutput, model: synthStep.model, duration_ms: Date.now() - start });
            }
          }

          // ────────────────────────────────────────────────────────────────────
          // MODE: SWARM — all agents tackle the prompt independently & in parallel,
          //               then a master synthesizer merges all outputs
          // ────────────────────────────────────────────────────────────────────
          else if (mode === 'swarm') {
            // Run all agents in parallel
            const swarmResults: Array<{ step: PipelineStepDef; content: string; dur: number }> = [];

            // We must stream tokens per-step — run sequentially but signal "parallel" to client
            send({ type: 'swarm_start', agents: steps.map(s => ({ step: s.step_index, name: s.persona_name, emoji: s.persona_emoji })) });

            for (const step of steps) {
              if (!checkKey(step)) return;
              const sys = [
                step.system_prompt ?? '',
                `\nYou are ${step.persona_emoji} ${step.persona_name} — ${step.role}.`,
                `Your task: ${step.instruction}`,
                '\nProvide your independent expert perspective. Do NOT reference other agents.',
              ].join('\n');
              const start = Date.now();
              send({ type: 'step_start', step: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role });
              const content = await callAI(step.model, apiKeyMap[detectProvider(step.model)], sys, [{ role: 'user', content: input_prompt }], (t) => send({ type: 'token', step: step.step_index, content: t }));
              const dur = Date.now() - start;
              send({ type: 'step_done', step: step.step_index, full_content: content, duration_ms: dur });
              swarmResults.push({ step, content, dur });
              stepsOutput.push({ step_index: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role, content, model: step.model, duration_ms: dur });
            }

            // Master synthesizer
            const synthStep = steps[0];
            if (checkKey(synthStep)) {
              const synthIdx = steps.length;
              const agentOutputs = swarmResults.map(r => `### ${r.step.persona_emoji} ${r.step.persona_name} (${r.step.role})\n${r.content}`).join('\n\n---\n\n');
              const synthSys = `You are a Master Synthesizer. ${steps.length} expert agents each tackled the same prompt independently. Your job: weave their insights into a single definitive, well-structured response that captures the best of every perspective. Resolve contradictions, amplify agreements, and produce something more valuable than any individual contribution.`;
              send({ type: 'step_start', step: synthIdx, agent_name: '🌀 Master Synthesis', agent_emoji: '🌀', role: 'Swarm Synthesizer' });
              const start = Date.now();
              finalOutput = await callAI(synthStep.model, apiKeyMap[detectProvider(synthStep.model)], synthSys, [{ role: 'user', content: `Prompt: ${input_prompt}\n\nAgent outputs:\n\n${agentOutputs}` }], (t) => send({ type: 'token', step: synthIdx, content: t }));
              send({ type: 'step_done', step: synthIdx, full_content: finalOutput, duration_ms: Date.now() - start });
              stepsOutput.push({ step_index: synthIdx, agent_name: '🌀 Master Synthesis', agent_emoji: '🌀', role: 'Swarm Synthesizer', content: finalOutput, model: synthStep.model, duration_ms: Date.now() - start });
            }
          }

          // ────────────────────────────────────────────────────────────────────
          // MODE: STORY — each agent writes a continuation of a collaborative narrative
          // ────────────────────────────────────────────────────────────────────
          else if (mode === 'story') {
            let narrative = '';
            for (const step of steps) {
              if (!checkKey(step)) return;
              const isFirst = step.step_index === 0;
              const sys = [
                step.system_prompt ?? '',
                `\nYou are ${step.persona_emoji} ${step.persona_name} — ${step.role}.`,
                step.instruction,
                isFirst
                  ? `\nYou are writing the OPENING of a collaborative story. Set the scene compellingly. End at a natural hand-off point.`
                  : `\nThe story so far:\n---\n${narrative}\n---\nContinue the story from exactly where it left off. Maintain narrative consistency, voice, and world rules established so far. Advance the plot. End at a new hand-off point.`,
              ].join('\n');
              const start = Date.now();
              send({ type: 'step_start', step: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role });
              const content = await callAI(step.model, apiKeyMap[detectProvider(step.model)], sys, [{ role: 'user', content: input_prompt }], (t) => send({ type: 'token', step: step.step_index, content: t }));
              const dur = Date.now() - start;
              narrative += (narrative ? '\n\n' : '') + content;
              stepsOutput.push({ step_index: step.step_index, agent_name: step.persona_name, agent_emoji: step.persona_emoji, role: step.role, content, model: step.model, duration_ms: dur });
              send({ type: 'step_done', step: step.step_index, full_content: content, duration_ms: dur });
            }
            finalOutput = narrative;
          }

          // Persist completed run
          await supabase
            .from('pipeline_runs')
            .update({ status: 'done', steps_output: stepsOutput, final_output: finalOutput, completed_at: new Date().toISOString() })
            .eq('id', runId);

          send({ type: 'pipeline_done', run_id: runId, final_output: finalOutput });

        } catch (err) {
          console.error('pipeline execution error:', err);
          send({ type: 'error', message: String(err) });
          await supabase.from('pipeline_runs').update({ status: 'error', error_message: String(err) }).eq('id', runId);
        }

        controller.enqueue(enc.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    console.error('run-pipeline error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineStepDef {
  step_index: number;
  persona_name: string;
  persona_emoji: string;
  role: string;
  instruction: string;
  model: string;
  system_prompt?: string;
}

interface RunPipelineRequest {
  pipeline_id?: string;
  pipeline_name: string;
  input_prompt: string;
  steps: PipelineStepDef[];
}

// ── Detect AI provider from model name ────────────────────────────────────────
function detectProvider(model: string): string {
  if (model.startsWith('gemini'))  return 'gemini';
  if (model.startsWith('claude'))  return 'claude';
  if (model.startsWith('llama') || model.startsWith('mixtral') || model.startsWith('gemma')) return 'groq';
  return 'openai';
}

// ── Call one AI step and collect the full response ────────────────────────────
async function callAI(
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  const provider = detectProvider(model);
  let fullContent = '';

  if (provider === 'openai' || provider === 'groq') {
    const baseUrl = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: allMessages, stream: true }),
    });

    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const token = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content ?? '';
          if (token) { onToken(token); fullContent += token; }
        } catch { /* skip */ }
      }
    }

  } else if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
    const parts = [];
    if (systemPrompt) parts.push({ text: `[System]: ${systemPrompt}\n\n` });
    for (const m of messages) parts.push({ text: `[${m.role === 'user' ? 'User' : 'Assistant'}]: ${m.content}\n` });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      const matches = buf.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g);
      for (const m of matches) {
        const token = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        onToken(token); fullContent += token;
      }
      // Keep last partial chunk in buffer
      const lastBrace = buf.lastIndexOf('{');
      if (lastBrace > 0) buf = buf.slice(lastBrace);
    }

  } else if (provider === 'claude') {
    const sysMsg = systemPrompt || undefined;
    const convMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 8192, stream: true, system: sysMsg, messages: convMsgs }),
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const token = JSON.parse(line.slice(6))?.delta?.text ?? '';
            if (token) { onToken(token); fullContent += token; }
          } catch { /* skip */ }
        }
      }
    }
  }

  return fullContent;
}

// ── Legacy sequential-only handler removed (superseded by the handler above) ──
