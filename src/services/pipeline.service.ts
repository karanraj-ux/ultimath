import { supabase } from '@/db/supabase';
import type { AgentPipeline, PipelineRun } from '@/types/types';

export const pipelineService = {
  // ── Pipelines ──────────────────────────────────────────────────────────────

  async getPipelines(): Promise<AgentPipeline[]> {
    const { data, error } = await supabase
      .from('agent_pipelines')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getTemplates(): Promise<AgentPipeline[]> {
    const { data, error } = await supabase
      .from('agent_pipelines')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getPipelineById(id: string): Promise<AgentPipeline | null> {
    const { data, error } = await supabase
      .from('agent_pipelines')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createPipeline(pipeline: Omit<AgentPipeline, 'id' | 'created_at' | 'updated_at'>): Promise<AgentPipeline> {
    const payload = {
      ...pipeline,
      is_template: pipeline.is_template ?? false,
    };
    const { data, error } = await supabase
      .from('agent_pipelines')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePipeline(id: string, updates: Partial<AgentPipeline>): Promise<void> {
    const { error } = await supabase
      .from('agent_pipelines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deletePipeline(id: string): Promise<void> {
    const { error } = await supabase
      .from('agent_pipelines')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Runs ───────────────────────────────────────────────────────────────────

  async getRuns(limit = 20): Promise<PipelineRun[]> {
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getRunById(id: string): Promise<PipelineRun | null> {
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteRun(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_runs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Sharing ────────────────────────────────────────────────────────────────

  /** Create or retrieve the share token for a pipeline. */
  async sharePipeline(pipelineId: string): Promise<string> {
    // Reuse existing share token if one already exists
    const { data: existing } = await supabase
      .from('pipeline_shares')
      .select('share_token')
      .eq('pipeline_id', pipelineId)
      .maybeSingle();
    if (existing?.share_token) return existing.share_token as string;

    const { data, error } = await supabase
      .from('pipeline_shares')
      .insert({ pipeline_id: pipelineId })
      .select('share_token')
      .single();
    if (error) throw error;
    return data.share_token as string;
  },

  /** Fetch the pipeline associated with a share token. */
  async getSharedPipeline(shareToken: string): Promise<AgentPipeline | null> {
    const { data: share, error: shareErr } = await supabase
      .from('pipeline_shares')
      .select('pipeline_id')
      .eq('share_token', shareToken)
      .maybeSingle();
    if (shareErr || !share) return null;

    return pipelineService.getPipelineById(share.pipeline_id as string);
  },

  /** Clone a pipeline into the current user's account. */
  async clonePipeline(source: AgentPipeline, nameSuffix = ' (Copy)'): Promise<AgentPipeline> {
    return pipelineService.createPipeline({
      name:          source.name + nameSuffix,
      description:   source.description ?? '',
      steps:         source.steps.map(s => ({ ...s })),
      is_template:   false,
      template_type: undefined,
      emoji:         source.emoji,
      category:      source.category,
    });
  },
};
