import { supabase } from '@/db/supabase';
import type { PromptTemplate } from '@/types/types';

export const promptTemplateService = {
  async getTemplates(): Promise<PromptTemplate[]> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPublicTemplates(): Promise<PromptTemplate[]> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getTemplateById(id: string): Promise<PromptTemplate | null> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createTemplate(template: Omit<PromptTemplate, 'id' | 'created_at'>): Promise<PromptTemplate> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<void> {
    const { error } = await supabase
      .from('prompt_templates')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
