import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Brain, AlertCircle } from 'lucide-react';
import { useMemory } from '@/hooks/use-memory';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MemoryManagerProps {
  id: string;
  type: 'conversation' | 'persona' | 'group';
}

export function MemoryManager({ id, type }: MemoryManagerProps) {
  const { memories, loading, clearMemories, deleteMemory } = useMemory(id, type);
  const [clearing, setClearing] = useState(false);

  const handleClearAll = async () => {
    try {
      setClearing(true);
      await clearMemories();
      toast.success('All memories cleared');
    } catch (err) {
      toast.error('Failed to clear memories');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await deleteMemory(memoryId);
      toast.success('Memory deleted');
    } catch (err) {
      toast.error('Failed to delete memory');
    }
  };

  const getImportanceColor = (score: number) => {
    if (score >= 8) return 'bg-destructive';
    if (score >= 5) return 'bg-primary';
    return 'bg-muted';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading memories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Memory
            </CardTitle>
            <CardDescription>
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
            </CardDescription>
          </div>
          {memories.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={clearing}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {memories.length} {memories.length === 1 ? 'memory' : 'memories'}. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No memories yet. Memories will be created automatically during conversations.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{memory.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="shrink-0 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {memory.context && (
                    <p className="text-xs text-muted-foreground">
                      Context: {memory.context}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${getImportanceColor(memory.importance_score)} text-white`}
                    >
                      Importance: {memory.importance_score}/10
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(memory.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
