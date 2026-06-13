import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, extractUserId } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  stream?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const authResult = extractUserId(req);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult;

  try {
    const body: ChatRequest = await req.json();
    const { model, messages, systemPrompt, stream = true } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Detect provider from model name
    let provider = 'openai';
    if (model.startsWith('gemini')) provider = 'gemini';
    else if (
      model.startsWith('llama') ||
      model.startsWith('mixtral') ||
      model.startsWith('gemma') ||
      model.startsWith('deepseek') ||
      model.startsWith('qwen')
    ) provider = 'groq';
    else if (model.startsWith('claude')) provider = 'claude';

    // Scope key lookup to the requesting user when authenticated
    let keyQuery = supabase
      .from('api_keys')
      .select('key_encrypted')
      .eq('provider', provider)
      .limit(1);

    if (userId) {
      keyQuery = keyQuery.eq('user_id', userId);
    }

    const { data: apiKeys, error: keyError } = await keyQuery;

    let apiKey = '';
    let usingPlatformCredits = false;

    if (!keyError && apiKeys && apiKeys.length > 0) {
      apiKey = apiKeys[0].key_encrypted;
    } else {
      // Fallback to platform credits if no personal API key is found
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Guests must provide an API key in Settings.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const { data: creditData } = await supabase.from('user_credits').select('balance').eq('user_id', userId).maybeSingle();
      if (!creditData || creditData.balance <= 0) {
        return new Response(
          JSON.stringify({ error: `You have run out of platform credits and have no ${provider} API key. Please upgrade your plan or add your own key in Settings.` }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // We have credits! Let's get the platform key.
      const envKeyName = `PLATFORM_${provider.toUpperCase()}_KEY`;
      apiKey = Deno.env.get(envKeyName) || '';
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: `Platform currently does not support managed keys for ${provider}. Please add your own key in Settings.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      usingPlatformCredits = true;
    }

    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Stream the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (provider === 'openai' || provider === 'groq') {
            const baseUrl = provider === 'groq'
              ? 'https://api.groq.com/openai/v1/chat/completions'
              : 'https://api.openai.com/v1/chat/completions';

            const res = await fetch(baseUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                stream: true,
                max_tokens: 8192,
                messages: allMessages.map(m => ({
                  role: m.role,
                  content: m.image_url && provider === 'openai'
                    ? [
                        { type: 'text', text: m.content },
                        { type: 'image_url', image_url: { url: m.image_url } },
                      ]
                    : m.content,
                })),
              }),
            });

            if (!res.ok) {
              const errText = await res.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errText })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = dec.decode(value);
              const lines = chunk.split('\n').filter(l => l.trim());
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content;
                    if (token) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                  } catch { /* skip malformed */ }
                }
              }
            }

          } else if (provider === 'gemini') {
            const contents = allMessages
              .filter(m => m.role !== 'system')
              .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: m.image_url
                  ? [{ text: m.content }, { image_url: { url: m.image_url } }]
                  : [{ text: m.content }],
              }));

            const systemInstruction = allMessages.find(m => m.role === 'system')?.content;

            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents,
                  ...(systemInstruction && {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                  }),
                  generationConfig: { maxOutputTokens: 8192 },
                }),
              }
            );

            if (!res.ok) {
              const errText = await res.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errText })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += dec.decode(value, { stream: true });
              // Gemini streams a JSON array — parse individual objects
              const objectRegex = /\{[^{}]*"text"\s*:\s*"([^"\\]|\\.)*"[^{}]*\}/g;
              let match;
              while ((match = objectRegex.exec(buffer)) !== null) {
                try {
                  const obj = JSON.parse(match[0]);
                  const token = obj?.text;
                  if (token) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                  }
                } catch { /* skip */ }
              }
            }
            // Also try full parse for remaining buffer
            try {
              const arr = JSON.parse(buffer.trim());
              for (const item of arr) {
                const token = item?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (token) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                }
              }
            } catch { /* already handled above */ }

          } else if (provider === 'claude') {
            const systemMsg = allMessages.find(m => m.role === 'system');
            const convMsgs = allMessages.filter(m => m.role !== 'system');

            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                max_tokens: 8192,
                stream: true,
                system: systemMsg?.content,
                messages: convMsgs.map(m => ({
                  role: m.role === 'assistant' ? 'assistant' : 'user',
                  content: m.image_url
                    ? [
                        { type: 'text', text: m.content },
                        { type: 'image', source: { type: 'url', url: m.image_url } },
                      ]
                    : m.content,
                })),
              }),
            });

            if (!res.ok) {
              const errText = await res.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errText })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = dec.decode(value);
              const lines = chunk.split('\n').filter(l => l.trim());
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const token = parsed?.delta?.text;
                    if (token) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                  } catch { /* skip */ }
                }
              }
            }
          }

          if (usingPlatformCredits && userId) {
            await supabase.rpc('deduct_credits', {
              p_user_id: userId,
              p_amount: 1,
              p_reason: 'AI chat generation'
            });
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
