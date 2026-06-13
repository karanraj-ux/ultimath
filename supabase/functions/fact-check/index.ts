import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AI_ENDPOINT =
  'https://app-bixm5zohn669-api-zYm4ze3j7XvL.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

function determineStatus(text: string): 'verified' | 'disputed' | 'unverifiable' {
  const lower = text.toLowerCase();
  if (
    lower.includes('correct') ||
    lower.includes('accurate') ||
    lower.includes('true') ||
    lower.includes('confirmed') ||
    lower.includes('verified') ||
    lower.includes('factual')
  ) return 'verified';
  if (
    lower.includes('false') ||
    lower.includes('incorrect') ||
    lower.includes('inaccurate') ||
    lower.includes('misleading') ||
    lower.includes('disputed') ||
    lower.includes('wrong') ||
    lower.includes('myth')
  ) return 'disputed';
  return 'unverifiable';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { messageContent, roomTopic, context, messageId, groupId, requestedBy } =
      await req.json();

    if (!messageContent || !messageId || !groupId) {
      return new Response(
        JSON.stringify({ error: 'messageContent, messageId, groupId are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'INTEGRATIONS_API_KEY not configured' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Build the fact-check prompt
    const contextLines = Array.isArray(context) && context.length > 0
      ? `\n\nRecent conversation context:\n${context.map((m: { sender_name: string; content: string }) => `${m.sender_name}: ${m.content}`).join('\n')}`
      : '';

    const prompt = `You are a neutral fact-checker. Analyze the following claim and determine if it is accurate, false, or unverifiable based on current knowledge and web sources.

Room topic: "${roomTopic || 'General discussion'}"
Claim to fact-check: "${messageContent}"${contextLines}

Provide:
1. A clear verdict (1-2 sentences) stating whether this claim is correct, incorrect, or cannot be verified
2. Key evidence supporting your verdict
3. Be direct and concise — this verdict will be locked as permanent record

Start your response with one of: "This claim is correct", "This claim is incorrect/false", or "This claim cannot be verified"`;

    // Call AI Search API with streaming
    const aiRes = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const err = await aiRes.text().catch(() => 'AI API error');
      return new Response(
        JSON.stringify({ error: err }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Collect full SSE stream
    const reader = aiRes.body.getReader();
    const dec = new TextDecoder();
    let fullText = '';
    const sourcesMap = new Map<string, string>(); // uri -> title

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const candidate = parsed?.candidates?.[0];
          if (!candidate) continue;
          // Accumulate text
          const textPart = candidate?.content?.parts?.[0]?.text;
          if (textPart) fullText += textPart;
          // Collect sources
          const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
          for (const c of chunks) {
            if (c?.web?.uri && !sourcesMap.has(c.web.uri)) {
              sourcesMap.set(c.web.uri, c.web.title ?? c.web.uri);
            }
          }
        } catch { /* skip malformed */ }
      }
    }

    if (!fullText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const verdictStatus = determineStatus(fullText);
    const sources = Array.from(sourcesMap.entries()).map(([url, title]) => ({ url, title }));

    // Persist verdict to Supabase (immutable — no update/delete)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: verdict, error: dbError } = await supabase
      .from('verdicts')
      .insert({
        group_id: groupId,
        message_id: messageId,
        verdict_text: fullText.trim(),
        verdict_status: verdictStatus,
        sources,
        requested_by: requestedBy || 'Anonymous',
      })
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ verdict }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
