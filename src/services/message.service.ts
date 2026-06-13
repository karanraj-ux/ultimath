import { supabase } from '@/db/supabase';
import type { GroupMessage } from '@/types/types';

export const messageService = {
  async getMessages(groupId: string, limit = 100): Promise<GroupMessage[]> {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createMessage(message: Omit<GroupMessage, 'id' | 'created_at'>): Promise<GroupMessage> {
    const { data, error } = await supabase
      .from('group_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToMessages(groupId: string, callback: (message: GroupMessage) => void) {
    // Use a unique prefix so this channel doesn't conflict with group.service's channel
    const channel = supabase
      .channel(`msg_svc_group_messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          callback(payload.new as GroupMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
