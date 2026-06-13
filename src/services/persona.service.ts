import { supabase } from '@/db/supabase';
import type { Persona } from '@/types/types';

export const personaService = {
  async getPersonas(userId?: string): Promise<Persona[]> {
    let query = supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getPersonaById(id: string): Promise<Persona | null> {
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createPersona(persona: Omit<Persona, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Persona> {
    const { data, error } = await supabase
      .from('personas')
      .insert(persona)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    const { data, error } = await supabase
      .from('personas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePersona(id: string): Promise<void> {
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateEmotionalState(id: string, emotionalState: string): Promise<void> {
    const { error } = await supabase
      .from('personas')
      .update({ emotional_state: emotionalState, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
