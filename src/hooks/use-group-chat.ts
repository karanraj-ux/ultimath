import { useState, useEffect, useCallback, useRef } from 'react';
import { groupService } from '@/services/group.service';
import { apiKeyService } from '@/services/apikey.service';
import { supabase } from '@/db/supabase';
import type { Group, GroupMember, GroupMessage, AIProvider } from '@/types/types';
import { toast } from 'sonner';

export function useGroupChat(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Refs so the realtime callback always sees the latest values (stale-closure fix)
  const groupRef    = useRef<Group | null>(null);
  const messagesRef = useRef<GroupMessage[]>([]);
  const aiTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { groupRef.current = group; }, [group]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    loadGroupData();

    // Subscribe to new messages
    const unsubMessages = groupService.subscribeToMessages(groupId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);

      // If it's a user message, trigger AI response after a short delay
      if (newMessage.sender_type === 'user') {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        aiTimerRef.current = setTimeout(() => generateAIResponse(), 1000);
      }
    });

    // Subscribe to new members
    const unsubMembers = groupService.subscribeToMembers(groupId, (newMember) => {
      setMembers(prev => [...prev, newMember]);
    });

    return () => {
      unsubMessages();
      unsubMembers();
      // Clear pending AI response timer on unmount (prevents setState after unmount)
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const [groupData, membersData, messagesData] = await Promise.all([
        groupService.getGroup(groupId),
        groupService.getGroupMembers(groupId),
        groupService.getMessages(groupId),
      ]);

      setGroup(groupData);
      setMembers(membersData);
      setMessages(messagesData);
    } catch (err) {
      console.error('Failed to load group data:', err);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (content: string, displayName: string, userId?: string, imageUrl?: string) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      await groupService.sendMessage(groupId, displayName, content, 'user', userId, imageUrl);
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  }, [groupId]);

  const generateAIResponse = async () => {
    // Read current values from refs — avoids stale closure over initial null/[]
    const currentGroup    = groupRef.current;
    const currentMessages = messagesRef.current;

    if (!currentGroup) return;

    try {
      // Get provider from model
      let provider: AIProvider = 'openai';
      if (currentGroup.ai_model.includes('gemini')) provider = 'gemini';
      else if (currentGroup.ai_model.includes('llama') || currentGroup.ai_model.includes('mixtral') || currentGroup.ai_model.includes('gemma')) provider = 'groq';
      else if (currentGroup.ai_model.includes('claude')) provider = 'claude';

      // Get API key
      const apiKey = await apiKeyService.getAPIKeyByProvider(provider);
      if (!apiKey) {
        console.error(`No API key found for ${provider}`);
        return;
      }

      // Build system prompt with all sections
      let systemPrompt = currentGroup.ai_system_prompt;
      if (currentGroup.ai_prompt_core_personality)    systemPrompt += `\n\nCore Personality: ${currentGroup.ai_prompt_core_personality}`;
      if (currentGroup.ai_prompt_contextual_behavior) systemPrompt += `\n\nContextual Behavior: ${currentGroup.ai_prompt_contextual_behavior}`;
      if (currentGroup.ai_prompt_knowledge_domain)    systemPrompt += `\n\nKnowledge Domain: ${currentGroup.ai_prompt_knowledge_domain}`;
      if (currentGroup.ai_prompt_interaction_style)   systemPrompt += `\n\nInteraction Style: ${currentGroup.ai_prompt_interaction_style}`;
      if (currentGroup.ai_prompt_memory_integration)  systemPrompt += `\n\nMemory Integration: ${currentGroup.ai_prompt_memory_integration}`;
      if (currentGroup.ai_prompt_emotional_response)  systemPrompt += `\n\nEmotional Response: ${currentGroup.ai_prompt_emotional_response}`;

      // Last 10 messages for context (use ref — always fresh)
      const recentMessages = currentMessages.slice(-10).map(m => ({
        role: m.sender_type === 'user' ? 'user' : 'assistant',
        content: `${m.sender_name}: ${m.content}`,
      }));

      // Call AI
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          model: currentGroup.ai_model,
          messages: recentMessages,
          systemPrompt,
        },
      });

      if (error) {
        const errorMsg = await error?.context?.text?.();
        throw new Error(errorMsg || error?.message || 'Failed to generate AI response');
      }

      // Send AI message
      await groupService.sendMessage(
        groupId,
        currentGroup.ai_persona_name,
        data.content,
        'ai'
      );
    } catch (err) {
      console.error('Failed to generate AI response:', err);
    }
  };

  const joinGroup = useCallback(async (displayName: string, userId?: string) => {
    try {
      await groupService.joinGroup(groupId, displayName, userId);
      toast.success('Joined group successfully');
    } catch (err) {
      console.error('Failed to join group:', err);
      toast.error('Failed to join group');
      throw err;
    }
  }, [groupId]);

  const leaveGroup = useCallback(async (userId?: string) => {
    try {
      await groupService.leaveGroup(groupId, userId);
      toast.success('Left group');
    } catch (err) {
      console.error('Failed to leave group:', err);
      toast.error('Failed to leave group');
      throw err;
    }
  }, [groupId]);

  return {
    group,
    members,
    messages,
    loading,
    sending,
    sendMessage,
    joinGroup,
    leaveGroup,
    refresh: loadGroupData,
  };
}
