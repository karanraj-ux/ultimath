import { supabase } from '@/db/supabase';
import type { APIKey, AIProvider } from '@/types/types';

export const apiKeyService = {
  async getAPIKeys(): Promise<APIKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getAPIKeyByProvider(provider: AIProvider): Promise<APIKey | null> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('provider', provider)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getDefaultAPIKey(): Promise<APIKey | null> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createAPIKey(provider: AIProvider, key: string, isDefault = false): Promise<APIKey> {
    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('api_keys')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        provider,
        key_encrypted: key, // In production, this should be encrypted
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAPIKey(id: string, key: string, isDefault?: boolean): Promise<APIKey> {
    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('api_keys')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const updates: any = {
      key_encrypted: key,
      updated_at: new Date().toISOString(),
    };

    if (isDefault !== undefined) {
      updates.is_default = isDefault;
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAPIKey(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
