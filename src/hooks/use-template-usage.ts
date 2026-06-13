/**
 * useTemplateUsage — clone-count tracking for both builtin and user templates
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';

interface UseTemplateUsageOptions {
  templateId: string;       // slug for builtin, uuid for user
  templateType: 'builtin' | 'user';
}

export function useTemplateUsage({ templateId, templateType }: UseTemplateUsageOptions) {
  const [cloneCount, setCloneCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!templateId) return;
    try {
      if (templateType === 'builtin') {
        const { data } = await supabase
          .from('template_usage')
          .select('clone_count')
          .eq('template_id', templateId)
          .maybeSingle();
        setCloneCount(data?.clone_count ?? 0);
      } else {
        const { data } = await supabase
          .from('agent_pipelines')
          .select('clone_count')
          .eq('id', templateId)
          .maybeSingle();
        setCloneCount(data?.clone_count ?? 0);
      }
    } catch { /* non-critical */ }
  }, [templateId, templateType]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const incrementCount = useCallback(async () => {
    try {
      if (templateType === 'builtin') {
        await supabase.rpc('increment_builtin_clone_count', { p_template_id: templateId });
      } else {
        const { data: cur } = await supabase
          .from('agent_pipelines')
          .select('clone_count')
          .eq('id', templateId)
          .maybeSingle();
        await supabase
          .from('agent_pipelines')
          .update({ clone_count: (cur?.clone_count ?? 0) + 1 })
          .eq('id', templateId);
      }
      setCloneCount(c => c + 1);
    } catch { /* non-critical */ }
  }, [templateId, templateType]);

  return { cloneCount, incrementCount, refetch: fetchCount };
}
