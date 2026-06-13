import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, extractUserId } from '../_shared/cors.ts';

// ── Persona colors assigned round-robin ────────────────────────────────────
const PERSONA_COLORS = [
  '#7c3aed', // violet
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
  '#ec4899', // pink
];

interface PersonaConfig {
  id: string;
  name: string;
  emoji: string;
  system_prompt: string;
  model: string;
  color?: string;
}

interface GroupChatMessage {
  role: 'user' | 'assistant';
  persona_id?: string;
  persona_name?: string;
  content: string;
}

interface GroupChatRequest {
  session_id?: string;
  user_message: string;
  personas: PersonaConfig[];
  history: GroupChatMessage[];
}

// SSE helper
function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const authResult = extractUserId(req);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(data)));

      try {
        const body: GroupChatRequest = await req.json();
        const { session_id, user_message, personas, history } = body;

        if (!personas || personas.length < 1) {
          send({ type: 'error', message: 'At least 1 persona required.' });
          controller.close();
          return;
        }

        // Assign colors
        const coloredPersonas = personas.map((p, i) => ({
          ...p,
          color: PERSONA_COLORS[i % PERSONA_COLORS.length],
        }));

        // Build base thread (history + user's new message)
        const baseThread: GroupChatMessage[] = [
          ...history,
          { role: 'user', content: user_message },
        ];

        // Per-persona running thread (grows as each persona responds)
        const runningThread: GroupChatMessage[] = [...baseThread];
        const allPersonaOutputs: GroupChatMessage[] = [];

        for (const persona of coloredPersonas) {
          // Get API key for this persona's model
          let provider = 'openai';
          if (persona.model.startsWith('gemini')) provider = 'gemini';
          else if (persona.model.startsWith('llama') || persona.model.startsWith('mixtral') ||
                   persona.model.startsWith('gemma') || persona.model.startsWith('deepseek') ||
                   persona.model.startsWith('qwen')) provider = 'groq';
          else if (persona.model.startsWith('claude')) provider = 'claude';

          let keyQuery = supabase
            .from('api_keys')
            .select('key_encrypted')
            .eq('provider', provider)
            .limit(1);
          if (userId) keyQuery = keyQuery.eq('user_id', userId);
          const { data: apiKeys } = await keyQuery;

          if (!apiKeys || apiKeys.length === 0) {
            send({
              type: 'persona_error',
              persona_id: persona.id,
              persona_name: persona.name,
              message: `No API key for ${provider}. Add one in Settings → API Keys.`,
            });
            continue;
          }
          const apiKey = apiKeys[0].key_encrypted;

          // Announce this persona is starting
          send({
            type: 'persona_start',
            persona_id: persona.id,
            persona_name: persona.name,
            persona_emoji: persona.emoji,
            persona_color: persona.color,
          });

          // Build messages for this persona
          // System prompt incorporates awareness of other personas in the room
          const otherNames = coloredPersonas
            .filter(p => p.id !== persona.id)
            .map(p => p.name)
            .join(', ');

          const systemPrompt = `${persona.system_prompt || `You are ${persona.name}.`}

You are participating in a multi-persona group chat. The other personas in the room are: ${otherNames || 'none'}.
You can see their responses and should engage with the conversation naturally — agree, disagree, build on, or challenge their points.
Be yourself, stay in character, and keep responses focused and conversational (2-4 paragraphs max).`;

          // Convert running thread to API messages
          const apiMessages = runningThread.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.persona_name
              ? `[${m.persona_name}]: ${m.content}`
              : m.content,
          }));

          // Call the AI
          let fullContent = '';
          const startTime = Date.now();

          try {
            if (provider === 'gemini') {
              // Gemini streaming
              const geminiMessages = apiMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              }));
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${persona.model}:streamGenerateContent?alt=sse&key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: geminiMessages,
                    generationConfig: { temperature: 0.85, maxOutputTokens: 1024 },
                  }),
                },
              );
              const gemReader = geminiRes.body!.getReader();
              const dec = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await gemReader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const raw = line.slice(6).trim();
                  if (raw === '[DONE]') break;
                  try {
                    const parsed = JSON.parse(raw);
                    const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                    if (token) {
                      fullContent += token;
                      send({ type: 'token', persona_id: persona.id, content: token });
                    }
                  } catch { /* skip */ }
                }
              }
            } else if (provider === 'claude') {
              // Anthropic streaming
              const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'anthropic-beta': 'messages-2023-06-01',
                },
                body: JSON.stringify({
                  model: persona.model,
                  max_tokens: 1024,
                  system: systemPrompt,
                  messages: apiMessages,
                  stream: true,
                }),
              });
              const claudeReader = claudeRes.body!.getReader();
              const dec = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await claudeReader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const raw = line.slice(6).trim();
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed.type === 'content_block_delta') {
                      const token = parsed.delta?.text ?? '';
                      if (token) {
                        fullContent += token;
                        send({ type: 'token', persona_id: persona.id, content: token });
                      }
                    }
                  } catch { /* skip */ }
                }
              }
            } else {
              // OpenAI / Groq streaming
              const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai' : 'https://api.openai.com';
              const oaiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: persona.model,
                  messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
                  stream: true,
                  temperature: 0.85,
                  max_tokens: 1024,
                }),
              });
              const oaiReader = oaiRes.body!.getReader();
              const dec = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await oaiReader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const raw = line.slice(6).trim();
                  if (raw === '[DONE]') break;
                  try {
                    const parsed = JSON.parse(raw);
                    const token = parsed.choices?.[0]?.delta?.content ?? '';
                    if (token) {
                      fullContent += token;
                      send({ type: 'token', persona_id: persona.id, content: token });
                    }
                  } catch { /* skip */ }
                }
              }
            }
          } catch (aiErr) {
            send({
              type: 'persona_error',
              persona_id: persona.id,
              persona_name: persona.name,
              message: String(aiErr),
            });
            continue;
          }

          const duration_ms = Date.now() - startTime;

          // Add persona response to running thread so next persona sees it
          const personaMsg: GroupChatMessage = {
            role: 'assistant',
            persona_id: persona.id,
            persona_name: persona.name,
            content: fullContent,
          };
          runningThread.push(personaMsg);
          allPersonaOutputs.push(personaMsg);

          send({
            type: 'persona_done',
            persona_id: persona.id,
            persona_name: persona.name,
            full_content: fullContent,
            duration_ms,
          });
        }

        // Persist new messages to session if session_id provided
        if (session_id) {
          const newMessages: GroupChatMessage[] = [
            { role: 'user', content: user_message },
            ...allPersonaOutputs,
          ];
          const { data: existing } = await supabase
            .from('group_chat_sessions')
            .select('messages')
            .eq('id', session_id)
            .maybeSingle();

          const prev: GroupChatMessage[] = Array.isArray(existing?.messages) ? existing.messages : [];
          await supabase
            .from('group_chat_sessions')
            .update({ messages: [...prev, ...newMessages], updated_at: new Date().toISOString() })
            .eq('id', session_id);
        }

        send({ type: 'session_done' });
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
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
});
