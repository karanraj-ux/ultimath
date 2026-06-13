/**
 * TemplateImportModal
 * File picker + drag-drop JSON import with preview and validation.
 */
import { useState, useRef, useCallback, type DragEvent } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Upload, FileJson, CheckCircle2, AlertCircle, Loader2, X, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineTemplate } from '@/data/pipelineTemplates';

// ── JSON validation ────────────────────────────────────────────────────────────

const MAX_BYTES = 1_048_576; // 1 MB

type ParseResult =
  | { ok: true; template: PipelineTemplate }
  | { ok: false; error: string };

function parseTemplateJSON(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON — the file could not be parsed.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'JSON must be an object.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    return { ok: false, error: 'Missing required field: "name".' };
  }
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    return { ok: false, error: 'Missing or empty "steps" array.' };
  }

  const category = (['Research', 'Writing', 'Code', 'Other'].includes(obj.category as string)
    ? obj.category
    : 'Other') as PipelineTemplate['category'];

  return {
    ok: true,
    template: {
      name:        (obj.name as string).trim(),
      emoji:       typeof obj.emoji === 'string' ? obj.emoji : '📋',
      description: typeof obj.description === 'string' ? obj.description : '',
      category,
      tags:        Array.isArray(obj.tags) ? (obj.tags as string[]) : [category],
      steps:       (obj.steps as Record<string, unknown>[]).map((s, i) => ({
        step_index:    i,
        persona_name:  typeof s.persona_name === 'string' ? s.persona_name : `Agent ${i + 1}`,
        persona_emoji: typeof s.persona_emoji === 'string' ? s.persona_emoji : '🤖',
        role:          typeof s.role === 'string' ? s.role : '',
        instruction:   typeof s.instruction === 'string' ? s.instruction : '',
        model:         typeof s.model === 'string' ? s.model : 'gemini-2.5-flash',
      })),
    },
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

interface TemplateImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (template: PipelineTemplate) => Promise<void>;
}

export function TemplateImportModal({ open, onClose, onImport }: TemplateImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PipelineTemplate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setPreview(null);

    if (file.size > MAX_BYTES) {
      setParseError('File too large — maximum size is 1 MB.');
      return;
    }
    if (!file.name.endsWith('.json')) {
      setParseError('Only .json files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = parseTemplateJSON(e.target?.result as string);
      if (result.ok) setPreview(result.template);
      else setParseError(result.error);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleImport = async () => {
    if (!preview || importing) return;
    setImporting(true);
    try {
      await onImport(preview);
      onClose();
      setPreview(null);
    } catch {
      toast.error('Import failed — please try again.');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setParseError(null);
    setDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Import Template
          </DialogTitle>
        </DialogHeader>

        {/* Drop zone / file picker */}
        {!preview && (
          <div
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-150 cursor-pointer',
              dragging
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30',
            )}
            onClick={() => inputRef.current?.click()}
          >
            <FileJson className={cn(
              'h-10 w-10 mx-auto mb-3 transition-colors',
              dragging ? 'text-primary' : 'text-muted-foreground/40',
            )} />
            <p className="text-sm font-medium text-balance">
              {dragging ? 'Drop your template here' : 'Drop a template JSON file here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse — max 1 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Invalid file</p>
              <p className="text-xs text-muted-foreground mt-0.5">{parseError}</p>
            </div>
            <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-400">Valid template detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">Review below, then confirm import.</p>
              </div>
              <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{preview.emoji}</span>
                <div>
                  <p className="font-bold text-sm">{preview.name}</p>
                  <p className="text-xs text-muted-foreground">{preview.steps.length} agent{preview.steps.length !== 1 ? 's' : ''} · {preview.category}</p>
                </div>
              </div>
              {preview.description && (
                <p className="text-xs text-muted-foreground text-pretty leading-relaxed">{preview.description}</p>
              )}
              <div className="space-y-1.5 pt-1">
                {preview.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="h-4 w-4 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {i + 1}
                    </div>
                    <span>{s.persona_emoji}</span>
                    <span className="font-medium">{s.persona_name}</span>
                    {s.role && <span className="text-muted-foreground/60">· {s.role}</span>}
                    {i < preview.steps.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          {!preview && !parseError && (
            <Button
              size="sm"
              className="h-9 flex-1 gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Choose file
            </Button>
          )}
          {parseError && (
            <Button
              size="sm" variant="outline"
              className="h-9 flex-1"
              onClick={reset}
            >
              Try another file
            </Button>
          )}
          {preview && (
            <Button
              size="sm"
              className="h-9 flex-1 gap-2 bg-primary hover:bg-primary/90"
              onClick={handleImport}
              disabled={importing}
            >
              {importing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              Import as Template
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
