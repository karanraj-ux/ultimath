import { cn } from '@/lib/utils';
import type { EmotionalState } from '@/types/types';

interface MoodIndicatorProps {
  mood: EmotionalState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

const moodColors: Record<EmotionalState, string> = {
  happy: 'mood-happy',
  excited: 'mood-excited',
  neutral: 'mood-neutral',
  sad: 'mood-sad',
  angry: 'mood-angry',
  frustrated: 'mood-frustrated',
  trusting: 'mood-trusting',
  suspicious: 'mood-suspicious',
};

const moodLabels: Record<EmotionalState, string> = {
  happy: 'Happy',
  excited: 'Excited',
  neutral: 'Neutral',
  sad: 'Sad',
  angry: 'Angry',
  frustrated: 'Frustrated',
  trusting: 'Trusting',
  suspicious: 'Suspicious',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function MoodIndicator({ mood, size = 'md', showLabel = false, animate = false }: MoodIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full transition-all duration-300',
          sizeClasses[size],
          moodColors[mood],
          animate && 'animate-pulse'
        )}
        style={animate ? { animation: 'pulse-mood 0.6s ease-in-out infinite' } : undefined}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{moodLabels[mood]}</span>
      )}
    </div>
  );
}
