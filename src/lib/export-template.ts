/**
 * exportTemplateAsJSON — download a template as a .json file
 */
import type { PipelineTemplate } from '@/data/pipelineTemplates';
import type { AgentPipeline } from '@/types/types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Export a PIPELINE_TEMPLATES entry */
export function exportBuiltinTemplate(tpl: PipelineTemplate): void {
  const payload = {
    name: tpl.name,
    emoji: tpl.emoji,
    description: tpl.description,
    category: tpl.category,
    tags: tpl.tags,
    steps: tpl.steps.map(s => ({
      persona_name:  s.persona_name,
      persona_emoji: s.persona_emoji,
      role:          s.role,
      instruction:   s.instruction,
      model:         s.model,
    })),
  };
  downloadJSON(payload, `${slugify(tpl.name)}-template.json`);
}

/** Export a user pipeline saved as template */
export function exportUserTemplate(pipeline: AgentPipeline): void {
  const payload = {
    name:        pipeline.name,
    emoji:       pipeline.emoji ?? '🔧',
    description: pipeline.description ?? '',
    category:    pipeline.category ?? 'Other',
    tags:        [pipeline.category ?? 'Other'],
    steps:       pipeline.steps.map(s => ({
      persona_name:  s.persona_name,
      persona_emoji: s.persona_emoji,
      role:          s.role,
      instruction:   s.instruction,
      model:         s.model,
    })),
  };
  downloadJSON(payload, `${slugify(pipeline.name)}-template.json`);
}

function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
