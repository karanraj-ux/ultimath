import { supabase } from '@/db/supabase';
import type { Contact } from '@/types/types';

export const contactService = {
  async getContacts(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getContactById(id: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createContact(
    name: string,
    type: 'friend' | 'anonymous',
    avatarUrl?: string
  ): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        type,
        avatar_url: avatarUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateContact(
    id: string,
    updates: Partial<Pick<Contact, 'name' | 'type' | 'avatar_url'>>
  ): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
