import { useState, useEffect } from 'react';
import { personaService } from '@/services/persona.service';
import type { Persona } from '@/types/types';

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const data = await personaService.getPersonas();
      setPersonas(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch personas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const createPersona = async (persona: Omit<Persona, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPersona = await personaService.createPersona(persona);
      setPersonas(prev => [newPersona, ...prev]);
      return newPersona;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create persona');
    }
  };

  const updatePersona = async (id: string, updates: Partial<Persona>) => {
    try {
      const updated = await personaService.updatePersona(id, updates);
      setPersonas(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update persona');
    }
  };

  const deletePersona = async (id: string) => {
    try {
      await personaService.deletePersona(id);
      setPersonas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete persona');
    }
  };

  return {
    personas,
    loading,
    error,
    refetch: fetchPersonas,
    createPersona,
    updatePersona,
    deletePersona,
  };
}
