import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageGenerationRequest {
  prompt: string;
  conversationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, conversationId }: ImageGenerationRequest = await req.json();

    // Get Nano Banana API key from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apiKeys, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('provider', 'nano_banana')
      .limit(1);

    if (keyError || !apiKeys || apiKeys.length === 0) {
      throw new Error('No Nano Banana API key found. Please add one in settings.');
    }

    const apiKey = apiKeys[0].key_encrypted;

    // Call Nano Banana API for image generation
    const response = await fetch('https://api.nanobanana.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nano Banana API error: ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Store image generation in database
    const { error: insertError } = await supabase
      .from('image_generations')
      .insert({
        conversation_id: conversationId,
        prompt,
        image_url: imageUrl,
        provider: 'nano_banana',
      });

    if (insertError) {
      console.error('Failed to store image generation:', insertError);
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
