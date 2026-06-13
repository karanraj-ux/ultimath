import { useState, useEffect, useCallback } from 'react';
import { messageService } from '@/services/message.service';
import { personaService } from '@/services/persona.service';
import { apiKeyService } from '@/services/apikey.service';
import { aiService } from '@/services/ai.service';
import type { GroupMessage, Persona, MemoryEntry, AIProvider } from '@/types/types';

export function useChat(groupId: string, personas: Persona[], memories: MemoryEntry[] = []) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const data = await messageService.getMessages(groupId);
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const unsubscribe = messageService.subscribeToMessages(groupId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      unsubscribe();
    };
  }, [groupId]);

  const sendUserMessage = useCallback(async (content: string, userName: string) => {
    try {
      setSending(true);
      
      // Create user message
      const userMessage = await messageService.createMessage({
        group_id: groupId,
        sender_type: 'user',
        sender_name: userName,
        content,
      });

      // Trigger persona responses
      setTimeout(() => {
        generatePersonaResponses();
      }, 1000);

    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [groupId, personas, messages, memories]);

  const generatePersonaResponses = async () => {
    // Randomly select 1-3 personas to respond
    const respondingPersonas = personas
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    for (const persona of respondingPersonas) {
      try {
        // Get provider from model
        const modelInfo = persona.ai_model;
        let provider: AIProvider = 'openai';
        if (modelInfo.includes('gemini')) provider = 'gemini';
        else if (modelInfo.includes('llama') || modelInfo.includes('mixtral') || modelInfo.includes('gemma')) provider = 'groq';
        else if (modelInfo.includes('claude')) provider = 'claude';
        
        // Get API key for this persona's model
        const apiKey = await apiKeyService.getAPIKeyByProvider(provider);
        if (!apiKey) {
          console.error(`No API key found for ${provider}`);
          continue;
        }

        // Generate response with delay for natural conversation flow
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

        const response = await aiService.generatePersonaResponse(
          persona,
          messages,
          memories,
          apiKey.key_encrypted
        );

        // Create persona message
        await messageService.createMessage({
          group_id: groupId,
          sender_id: persona.id,
          sender_type: 'ai',
          sender_name: persona.name,
          content: response.content,
        });

        // Update persona's emotional state
        if (response.emotional_state) {
          await personaService.updateEmotionalState(persona.id, response.emotional_state);
        }

      } catch (err) {
        console.error(`Failed to generate response for ${persona.name}:`, err);
      }
    }
  };

  return {
    messages,
    loading,
    sending,
    sendUserMessage,
  };
}
