import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMemory } from '@/hooks/use-memory';
import { Brain, Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface MemoryManagerProps {
  conversationId: string;
}

export function MemoryManager({ conversationId }: MemoryManagerProps) {
  const { memories, loading, addMemory, deleteMemory, updateImportance } = useMemory(
    conversationId,
    'conversation'
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [content, setContent] = useState('');
  const [context, setContext] = useState('');
  const [importance, setImportance] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) {
      toast.error('Please enter memory content');
      return;
    }

    try {
      setSubmitting(true);
      await addMemory(content.trim(), context.trim() || undefined, importance);
      toast.success('Memory added');
      setContent('');
      setContext('');
      setImportance(5);
      setShowAddDialog(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      toast.success('Memory deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImportanceChange = async (id: string, score: number) => {
    try {
      await updateImportance(id, score);
      toast.success('Importance updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <h3 className="font-semibold">Conversation Memory</h3>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading memories...</p>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No memories yet. Add important information to remember across conversations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {memories.map((memory) => (
            <Card key={memory.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{memory.content}</p>
                    {memory.context && (
                      <p className="text-xs text-muted-foreground mt-1">{memory.context}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Importance: {memory.importance_score || 5}/10
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleImportanceChange(
                          memory.id,
                          Math.min((memory.importance_score || 5) + 1, 10)
                        )
                      }
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(memory.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Memory</DialogTitle>
            <DialogDescription>
              Add important information to remember in this conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Memory Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g., User prefers Python over JavaScript"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context (optional)</Label>
              <Input
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., Programming preferences"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance (1-10)</Label>
              <Input
                id="importance"
                type="number"
                min="1"
                max="10"
                value={importance}
                onChange={(e) => setImportance(parseInt(e.target.value) || 5)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Memory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
