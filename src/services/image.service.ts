import { supabase } from '@/db/supabase';
import type { ImageGeneration } from '@/types/types';

export const imageService = {
  async generateImage(prompt: string, conversationId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt, conversationId },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      throw new Error(errorMsg || error.message);
    }

    return data.imageUrl;
  },

  async getImageGenerations(conversationId: string): Promise<ImageGeneration[]> {
    const { data, error } = await supabase
      .from('image_generations')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
