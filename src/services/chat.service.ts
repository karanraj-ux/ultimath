import { supabase } from '@/db/supabase';
import type { Conversation, SoloMessage, AIModel, AIRequestPayload, AIResponse } from '@/types/types';

export const chatService = {
  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createConversation(model: AIModel, title?: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        model,
        title: title || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Messages
  async getMessages(conversationId: string): Promise<SoloMessage[]> {
    const { data, error } = await supabase
      .from('solo_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addMessage(message: Omit<SoloMessage, 'id' | 'created_at'>): Promise<SoloMessage> {
    const { data, error } = await supabase
      .from('solo_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(id: string): Promise<void> {
    const { error} = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // AI Chat
  async sendChatMessage(payload: AIRequestPayload): Promise<AIResponse> {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: payload,
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      const errorText = errorMsg || error.message;
      
      // Check if it's an API key error
      if (errorText.includes('No API key found')) {
        throw new Error('API_KEY_MISSING');
      }
      
      throw new Error(errorText);
    }

    return data;
  },

  // Share conversation
  async shareConversation(conversationId: string): Promise<string> {
    // Generate slug
    const { data: slugData, error: slugError } = await supabase
      .rpc('generate_share_slug');

    if (slugError) throw slugError;

    const slug = slugData as string;

    // Get conversation title
    const conversation = await this.getConversationById(conversationId);

    // Create shared chat
    const { error } = await supabase
      .from('shared_chats')
      .insert({
        slug,
        conversation_id: conversationId,
        title: conversation?.title || 'Shared Conversation',
      });

    if (error) throw error;

    return slug;
  },

  async getSharedChat(slug: string) {
    const { data, error } = await supabase
      .from('shared_chats')
      .select('*, conversation:conversations(*)')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;

    // Increment view count
    if (data) {
      await supabase
        .from('shared_chats')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('slug', slug);
    }

    return data;
  },

  async getSharedMessages(conversationId: string): Promise<SoloMessage[]> {
    const { data, error } = await supabase
      .from('solo_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Realtime subscription
  subscribeToMessages(
    conversationId: string,
    callback: (message: SoloMessage) => void
  ) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as SoloMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
