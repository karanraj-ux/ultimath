import { supabase } from '@/db/supabase';
import type { MemoryEntry } from '@/types/types';

export const memoryService = {
  async getMemoriesForConversation(conversationId: string): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('memory_entries')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getMemoriesForGroup(groupId: string): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('memory_entries')
      .select('*')
      .eq('group_id', groupId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getMemoriesForPersona(personaId: string): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('memory_entries')
      .select('*')
      .eq('persona_id', personaId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createMemory(memory: Omit<MemoryEntry, 'id' | 'created_at'>): Promise<MemoryEntry> {
    const { data, error } = await supabase
      .from('memory_entries')
      .insert(memory)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMemory(
    id: string,
    updates: Partial<Pick<MemoryEntry, 'content' | 'context' | 'importance_score'>>
  ): Promise<MemoryEntry> {
    const { data, error } = await supabase
      .from('memory_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMemory(id: string): Promise<void> {
    const { error } = await supabase
      .from('memory_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Extract important information from conversation
  extractMemories(messages: Array<{ role: string; content: string }>): string[] {
    const memories: string[] = [];
    
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Extract names
      const nameMatch = content.match(/my name is (\w+)|i'm (\w+)|i am (\w+)/i);
      if (nameMatch) {
        const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
        memories.push(`User's name is ${name}`);
      }
      
      // Extract preferences
      if (content.includes('i like') || content.includes('i love')) {
        const preference = content.match(/i (like|love) (.+?)(?:\.|$)/i);
        if (preference) {
          memories.push(`User likes ${preference[2]}`);
        }
      }
      
      // Extract dislikes
      if (content.includes("i don't like") || content.includes('i hate')) {
        const dislike = content.match(/i (don't like|hate) (.+?)(?:\.|$)/i);
        if (dislike) {
          memories.push(`User dislikes ${dislike[2]}`);
        }
      }
      
      // Extract goals
      if (content.includes('my goal') || content.includes('i want to')) {
        const goal = content.match(/(?:my goal is|i want to) (.+?)(?:\.|$)/i);
        if (goal) {
          memories.push(`User's goal: ${goal[1]}`);
        }
      }
    }
    
    return memories;
  },

  // Format memories for AI context
  formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return '';
    
    const formatted = memories
      .map((m) => `- ${m.content}${m.context ? ` (${m.context})` : ''}`)
      .join('\n');
    
    return `\n\nRemembered information about this conversation:\n${formatted}\n`;
  },
};
