/**
 * StarRating — display-only and interactive star rating component.
 * Supports filled / half / empty states, hover preview, and click-to-rate.
 */
import { useState, useId } from 'react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  average: number;        // 0–5 (1 decimal)
  count: number;          // total rating count
  userRating?: number | null;  // current user's rating (1–5) or null
  interactive?: boolean;  // if true, renders clickable stars
  onRate?: (rating: number) => void;
  submitting?: boolean;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

function StarIcon({
  fill,
  size,
  gradientId,
  className,
}: {
  fill: 'full' | 'half' | 'empty';
  size: 'sm' | 'md';
  gradientId: string;
  className?: string;
}) {
  const dim = size === 'sm' ? 12 : 16;
  if (fill === 'full') {
    return (
      <svg width={dim} height={dim} viewBox="0 0 24 24" className={className}>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (fill === 'half') {
    return (
      <svg width={dim} height={dim} viewBox="0 0 24 24" className={className}>
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={`url(#${gradientId})`}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg width={dim} height={dim} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StarRating({
  average,
  count,
  userRating,
  interactive = false,
  onRate,
  submitting = false,
  size = 'sm',
  showCount = true,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  // Unique per-instance gradient ID so multiple StarRatings on the same page
  // don't fight over the same SVG <defs> reference.
  const uid = useId().replace(/:/g, '');
  const gradientId = `star-half-${uid}`;

  const displayRating = hovered ?? average;

  const getFill = (starIndex: number): 'full' | 'half' | 'empty' => {
    const val = interactive ? (hovered ?? userRating ?? 0) : displayRating;
    if (val >= starIndex) return 'full';
    if (val >= starIndex - 0.5) return 'half';
    return 'empty';
  };

  return (
    <div className={cn('flex items-center gap-1.5', submitting && 'opacity-50 pointer-events-none')}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            disabled={!interactive || submitting}
            onClick={() => interactive && onRate?.(i)}
            onMouseEnter={() => interactive && setHovered(i)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={cn(
              'transition-colors duration-150',
              interactive
                ? 'cursor-pointer text-amber-400 hover:text-amber-300'
                : 'cursor-default text-amber-400',
              !interactive && count === 0 && 'text-muted-foreground/30',
            )}
            aria-label={interactive ? `Rate ${i} star${i !== 1 ? 's' : ''}` : undefined}
          >
            <StarIcon
              fill={getFill(i)}
              size={size}
              gradientId={gradientId}
              className={cn(
                interactive && hovered !== null && i <= hovered
                  ? 'text-amber-300'
                  : undefined,
              )}
            />
          </button>
        ))}
      </div>

      {showCount && (
        <span className={cn(
          'font-mono tabular-nums text-muted-foreground',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
        )}>
          {count > 0 ? (
            <>
              <span className="text-amber-400">{average.toFixed(1)}</span>
              <span className="opacity-60 ml-0.5">({count})</span>
            </>
          ) : (
            <span className="opacity-40">No ratings</span>
          )}
        </span>
      )}
    </div>
  );
}
