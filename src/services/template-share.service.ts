/**
 * templateShareService — create and resolve public share links for templates.
 *
 * Each call to share*() inserts a NEW token (sharers can share multiple times;
 * existing links still work because all tokens resolve via the same lookup).
 */
import { supabase } from '@/db/supabase';
import type { AgentPipeline, PipelineStep } from '@/types/types';
import type { PipelineTemplate } from '@/data/pipelineTemplates';

// ── Shared template data returned by getSharedTemplate ────────────────────────

export interface SharedTemplateData {
  shareToken: string;
  templateId: string;
  templateType: 'builtin' | 'user';
  name: string;
  emoji: string;
  description: string;
  category: string;
  tags: string[];
  steps: (Omit<PipelineStep, 'step_index'> & { step_index?: number })[];
  cloneCount: number;
  pipelineId: string | null; // present only for user templates
}

// ── Service ───────────────────────────────────────────────────────────────────

export const templateShareService = {
  /**
   * Generate a new share token for a built-in template.
   * @param templateSlug  Slugified name used as template_id (e.g. "research-report")
   * @param _templateData  Passed for future validation; unused in DB call.
   */
  async shareBuiltinTemplate(
    templateSlug: string,
    _templateData?: PipelineTemplate,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('template_shares')
      .insert({ template_id: templateSlug, template_type: 'builtin' })
      .select('share_token')
      .single();
    if (error) throw error;
    return data.share_token as string;
  },

  /**
   * Generate a new share token for a user-created template pipeline.
   * @param pipelineId  UUID of the agent_pipelines row.
   */
  async shareUserTemplate(pipelineId: string): Promise<string> {
    const { data, error } = await supabase
      .from('template_shares')
      .insert({
        template_id:   pipelineId,
        template_type: 'user',
        pipeline_id:   pipelineId,
      })
      .select('share_token')
      .single();
    if (error) throw error;
    return data.share_token as string;
  },

  /**
   * Resolve a share token to full template data.
   * Returns null if the token is unknown or the underlying template is gone.
   */
  async getSharedTemplate(shareToken: string): Promise<SharedTemplateData | null> {
    // 1. Fetch the share row
    const { data: share, error: shareErr } = await supabase
      .from('template_shares')
      .select('template_id, template_type, pipeline_id')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (shareErr || !share) return null;

    const { template_id, template_type, pipeline_id } = share as {
      template_id: string;
      template_type: 'builtin' | 'user';
      pipeline_id: string | null;
    };

    // 2a. Built-in template — data lives in the hardcoded catalog
    if (template_type === 'builtin') {
      // Lazy-import to avoid circular dependency at module level
      const { PIPELINE_TEMPLATES } = await import('@/data/pipelineTemplates');
      const tpl = PIPELINE_TEMPLATES.find(
        t => t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === template_id,
      );
      if (!tpl) return null;

      // Fetch clone count from template_usage
      const { data: usageRow } = await supabase
        .from('template_usage')
        .select('clone_count')
        .eq('template_id', template_id)
        .maybeSingle();

      return {
        shareToken,
        templateId:   template_id,
        templateType: 'builtin',
        name:         tpl.name,
        emoji:        tpl.emoji,
        description:  tpl.description,
        category:     tpl.category,
        tags:         tpl.tags,
        steps:        tpl.steps,
        cloneCount:   (usageRow as { clone_count?: number } | null)?.clone_count ?? 0,
        pipelineId:   null,
      };
    }

    // 2b. User template — data lives in agent_pipelines
    if (!pipeline_id) return null;

    const { data: pipeline, error: pipeErr } = await supabase
      .from('agent_pipelines')
      .select('*')
      .eq('id', pipeline_id)
      .maybeSingle();

    if (pipeErr || !pipeline) return null;

    const p = pipeline as AgentPipeline;
    return {
      shareToken,
      templateId:   template_id,
      templateType: 'user',
      name:         p.name,
      emoji:        p.emoji ?? '🔧',
      description:  p.description ?? '',
      category:     p.category ?? 'Other',
      tags:         [p.category ?? 'Other'],
      steps:        p.steps,
      cloneCount:   p.clone_count ?? 0,
      pipelineId:   pipeline_id,
    };
  },
};
