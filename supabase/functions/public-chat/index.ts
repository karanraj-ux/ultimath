import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string;
}

interface PublicChatRequest {
  shareToken: string;
  messages: ChatMessage[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PublicChatRequest = await req.json();
    const { shareToken, messages } = body;

    if (!shareToken || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing shareToken or messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Tool and Persona Details
    const { data: tool, error: toolError } = await supabase
      .from('shared_tools')
      .select('is_active, creator_id, persona_id, personas(system_prompt, ai_model, name)')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (toolError || !tool || !tool.is_active) {
      return new Response(JSON.stringify({ error: 'This tool is temporarily unavailable or does not exist.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1.5 Increment tool chats_count (non-blocking)
    supabase.rpc('increment_tool_chats', { p_token: shareToken }).catch(console.error);

    // 1.6 Check Creator's Credit Pool
    const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', tool.creator_id)
      .maybeSingle();

    if (creditError || !creditData || creditData.balance <= 0) {
      return new Response(JSON.stringify({ error: 'This tool has reached its usage limit. The creator has run out of credits.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const persona = tool.personas as any;
    const systemPrompt = persona.system_prompt || `You are an AI assistant named ${persona.name}.`;
    const model = persona.ai_model || 'gemini-2.5-flash';
    
    // For this specific feature, we only support Gemini using the platform key for now
    if (!model.startsWith('gemini')) {
       return new Response(JSON.stringify({ error: 'Public tools currently only support Gemini models.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve Platform API Key
    const platformKey = Deno.env.get('PLATFORM_GEMINI_KEY');
    if (!platformKey) {
      return new Response(JSON.stringify({ error: 'Platform API key not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // 2. Call Gemini API
    const contents = allMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${platformKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: 'AI API Error: ' + errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Stream Response Back
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += dec.decode(value, { stream: true });
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
          // Parse remainder
          try {
            const arr = JSON.parse(buffer.trim());
            for (const item of arr) {
              const token = item?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (token) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            }
          } catch { /* skip */ }

          // Decrement creator credit
          await supabase.rpc('deduct_credits', {
            p_user_id: tool.creator_id,
            p_amount: 1,
            p_reason: `Public tool chat: ${tool.share_token}`
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
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
    console.error('Public chat error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
