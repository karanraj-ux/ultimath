import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoodIndicator } from './MoodIndicator';
import { Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Persona } from '@/types/types';

interface PersonaCardProps {
  persona: Persona;
  onEdit?: (persona: Persona) => void;
  onDelete?: (id: string) => void;
  onClick?: (persona: Persona) => void;
  compact?: boolean;
}

const personalityColors: Record<string, string> = {
  'caring friend': 'bg-mood-trusting/20 text-mood-trusting',
  'sarcastic rival': 'bg-mood-frustrated/20 text-mood-frustrated',
  'wise mentor': 'bg-mood-neutral/20 text-mood-neutral',
  'playful trickster': 'bg-mood-excited/20 text-mood-excited',
  'serious analyst': 'bg-mood-neutral/20 text-mood-neutral',
};

export function PersonaCard({ persona, onEdit, onDelete, onClick, compact = false }: PersonaCardProps) {
  const initials = persona.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200 hover:shadow-md cursor-pointer',
        compact && 'p-3'
      )}
      onClick={() => onClick?.(persona)}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className={cn(compact ? 'w-10 h-10' : 'w-12 h-12')}>
            <AvatarImage src={persona.avatar_url} alt={persona.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <MoodIndicator mood={persona.emotional_state} size="sm" animate />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={cn('font-semibold truncate', compact ? 'text-sm' : 'text-base')}>
                {persona.name}
              </h3>
              <p className={cn('text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
                {persona.personality_profile}
              </p>
            </div>

            {!compact && (onEdit || onDelete) && (
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(persona);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(persona.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {persona.ai_model.toUpperCase()}
              </Badge>
              <MoodIndicator mood={persona.emotional_state} size="sm" showLabel />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
