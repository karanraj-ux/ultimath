import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, extractUserId } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authResult = extractUserId(req);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult;

  try {
    const { taskType, input, model = 'gemini-1.5-flash' } = await req.json();
    if (!input || !taskType) {
      return new Response(JSON.stringify({ error: 'Missing input or taskType' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // B2B Task Costs 5 credits
    if (userId) {
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();
        
      if (!creditsData || creditsData.balance < 5) {
        return new Response(JSON.stringify({ error: 'Insufficient credits (5 required)' }), { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    const apiKey = Deno.env.get('PLATFORM_GEMINI_KEY');
    if (!apiKey) throw new Error('No PLATFORM_GEMINI_KEY configured');

    let systemInstruction = '';
    let responseSchema = null;

    if (taskType === 'bug_fixer') {
      systemInstruction = `You are a dual-agent execution engine: Agent A (Brutal Security/Performance Lead) and Agent B (Premium UI/UX Designer).
Analyze the input text completely. 
Output exactly a JSON object containing:
1. 'tickets': Array of objects { title, description, priority (High/Medium/Low) }
2. 'patches': Array of objects { file_path, code, explanation }
3. 'prompts': Array of objects { title, prompt_to_run }`;
      
      responseSchema = {
        type: "OBJECT",
        properties: {
          tickets: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { title: { type: "STRING" }, description: { type: "STRING" }, priority: { type: "STRING" } },
              required: ["title", "description", "priority"]
            }
          },
          patches: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { file_path: { type: "STRING" }, code: { type: "STRING" }, explanation: { type: "STRING" } },
              required: ["file_path", "code", "explanation"]
            }
          },
          prompts: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { title: { type: "STRING" }, prompt_to_run: { type: "STRING" } },
              required: ["title", "prompt_to_run"]
            }
          }
        },
        required: ["tickets", "patches", "prompts"]
      };
    } else if (taskType === 'marketing') {
      systemInstruction = `You are a dual-agent engine: Agent A (Master Copywriter) and Agent B (SEO Specialist).
Analyze the input. Output exactly a JSON object containing:
1. 'variants': Array of objects { title, copy, tone }
2. 'seo_keywords': Array of strings
3. 'ab_test_plan': String describing how to test`;
      
      responseSchema = {
        type: "OBJECT",
        properties: {
          variants: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { title: { type: "STRING" }, copy: { type: "STRING" }, tone: { type: "STRING" } },
              required: ["title", "copy", "tone"]
            }
          },
          seo_keywords: { type: "ARRAY", items: { type: "STRING" } },
          ab_test_plan: { type: "STRING" }
        },
        required: ["variants", "seo_keywords", "ab_test_plan"]
      };
    } else {
       // Code Optimizer fallback
       systemInstruction = `You are a Senior Architect. Analyze the code input. Output a JSON object with 'refactored_code' (string), 'performance_notes' (array of strings), and 'security_warnings' (array of strings).`;
    }

    const bodyPayload: any = {
      contents: [{ role: 'user', parts: [{ text: input }] }],
      generationConfig: { 
        responseMimeType: "application/json",
      }
    };
    if (systemInstruction) {
      bodyPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    if (responseSchema) {
      bodyPayload.generationConfig.responseSchema = responseSchema;
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const data = await res.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Deduct credits
    if (userId) {
      await supabase.rpc('deduct_credits', { p_user_id: userId, p_amount: 5, p_reason: 'B2B Execution Engine' });
    }

    return new Response(textOutput, { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Task error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});