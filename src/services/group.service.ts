import { supabase } from '@/db/supabase';
import type { Group, GroupMember, GroupMessage, AIModel, PromptSections } from '@/types/types';

export const groupService = {
  // Groups
  async getGroups(): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getGroupByJoinCode(joinCode: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', joinCode)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createGroup(
    name: string,
    description: string,
    aiModel: AIModel,
    aiPersonaName: string,
    aiSystemPrompt: string,
    prompts?: PromptSections
  ): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        ai_model: aiModel,
        ai_persona_name: aiPersonaName,
        ai_system_prompt: aiSystemPrompt,
        ai_prompt_core_personality: prompts?.core_personality,
        ai_prompt_contextual_behavior: prompts?.contextual_behavior,
        ai_prompt_knowledge_domain: prompts?.knowledge_domain,
        ai_prompt_interaction_style: prompts?.interaction_style,
        ai_prompt_memory_integration: prompts?.memory_integration,
        ai_prompt_emotional_response: prompts?.emotional_response,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (error) throw error;
  },

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
  },

  // Group Members
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async joinGroup(groupId: string, displayName: string, userId?: string): Promise<GroupMember> {
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId || null,
        display_name: displayName,
        is_anonymous: !userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async leaveGroup(groupId: string, userId?: string): Promise<void> {
    const query = supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId);

    if (userId) {
      query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) throw error;
  },

  // Group Messages
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

  async sendMessage(
    groupId: string,
    senderName: string,
    content: string,
    senderType: 'user' | 'ai' = 'user',
    senderId?: string,
    imageUrl?: string
  ): Promise<GroupMessage> {
    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: senderId || null,
        sender_name: senderName,
        sender_type: senderType,
        content,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToMessages(groupId: string, callback: (message: GroupMessage) => void) {
    const channel = supabase
      .channel(`group_messages:${groupId}`)
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

  subscribeToMembers(groupId: string, callback: (member: GroupMember) => void) {
    const channel = supabase
      .channel(`group_members:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          callback(payload.new as GroupMember);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
