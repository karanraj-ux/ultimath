/**
 * useTemplateRatings
 * Fetch aggregated rating stats and submit/update ratings for any template.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { getOrCreateFingerprint } from './use-user-fingerprint';
import type { RatingStats } from '@/types/types';

interface UseTemplateRatingsOptions {
  templateId: string;
  templateType: 'builtin' | 'user';
}

export function useTemplateRatings({ templateId, templateType }: UseTemplateRatingsOptions) {
  const [stats, setStats] = useState<RatingStats>({ average: 0, count: 0, userRating: null });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const fingerprint = getOrCreateFingerprint();
      const { data, error } = await supabase
        .from('template_ratings')
        .select('rating, user_fingerprint')
        .eq('template_id', templateId)
        .eq('template_type', templateType);

      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const count = rows.length;
      const average = count > 0
        ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0;
      const userRow = rows.find(r => r.user_fingerprint === fingerprint);
      setStats({ average, count, userRating: userRow?.rating ?? null });
    } catch {
      // silently fail — ratings are non-critical
    } finally {
      setLoading(false);
    }
  }, [templateId, templateType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const submitRating = useCallback(async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const fingerprint = getOrCreateFingerprint();
      const { error } = await supabase
        .from('template_ratings')
        .upsert(
          { template_id: templateId, template_type: templateType, user_fingerprint: fingerprint, rating },
          { onConflict: 'template_id,user_fingerprint' }
        );
      if (error) throw error;
      await fetchStats();
    } finally {
      setSubmitting(false);
    }
  }, [templateId, templateType, submitting, fetchStats]);

  return { stats, loading, submitting, submitRating, refetch: fetchStats };
}
