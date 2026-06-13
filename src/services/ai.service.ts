import { supabase } from '@/db/supabase';
import type { Persona, GroupMessage, MemoryEntry, AIResponse } from '@/types/types';

export const aiService = {
  async generatePersonaResponse(
    persona: Persona,
    messages: GroupMessage[],
    memories: MemoryEntry[],
    apiKey: string
  ): Promise<AIResponse> {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        model: persona.ai_model,
        messages: messages.map(m => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        systemPrompt: persona.system_prompt,
        memory: memories,
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      throw new Error(errorMsg || error?.message || 'Failed to generate response');
    }

    return data as AIResponse;
  },
};
