import { useState, useEffect } from 'react';
import { memoryService } from '@/services/memory.service';
import type { MemoryEntry } from '@/types/types';

export function useMemory(id: string, type: 'conversation' | 'persona' | 'group') {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, [id, type]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: MemoryEntry[];
      
      if (type === 'conversation') {
        data = await memoryService.getMemoriesForConversation(id);
      } else if (type === 'group') {
        data = await memoryService.getMemoriesForGroup(id);
      } else {
        // persona — load by persona_id
        data = await memoryService.getMemoriesForPersona(id);
      }
      
      setMemories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const addMemory = async (content: string, context?: string, importanceScore: number = 5) => {
    try {
      const memoryData: any = {
        content,
        context,
        importance_score: importanceScore,
      };

      if (type === 'conversation') {
        memoryData.conversation_id = id;
      } else if (type === 'persona') {
        memoryData.persona_id = id;
      } else {
        memoryData.group_id = id;
      }

      const newMemory = await memoryService.createMemory(memoryData);
      setMemories(prev => [newMemory, ...prev]);
      return newMemory;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add memory');
    }
  };

  const clearMemories = async () => {
    try {
      // Delete all memories for this conversation/group
      for (const memory of memories) {
        await memoryService.deleteMemory(memory.id);
      }
      setMemories([]);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to clear memories');
    }
  };

  const getTopMemories = async (limit: number = 10) => {
    try {
      // Return top N memories sorted by importance
      return memories.slice(0, limit);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get top memories');
    }
  };

  const updateImportance = async (memoryId: string, score: number) => {
    try {
      await memoryService.updateMemory(memoryId, { importance_score: score });
      setMemories(prev =>
        prev.map(m => (m.id === memoryId ? { ...m, importance_score: score } : m))
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update importance');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      await memoryService.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  return {
    memories,
    loading,
    error,
    addMemory,
    clearMemories,
    getTopMemories,
    updateImportance,
    deleteMemory,
    refresh: loadMemories,
  };
}
