import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoodIndicator } from './MoodIndicator';
import { cn } from '@/lib/utils';
import type { GroupMessage } from '@/types/types';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: GroupMessage;
  avatarUrl?: string;
  isUser?: boolean;
}

export function ChatMessage({ message, avatarUrl, isUser = false }: ChatMessageProps) {
  const initials = message.sender_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timestamp = format(new Date(message.created_at), 'HH:mm');

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-200',
        isUser && 'flex-row-reverse'
      )}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={avatarUrl} alt={message.sender_name} />
        <AvatarFallback className={cn(isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col gap-1 max-w-[70%]', isUser && 'items-end')}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message.sender_name}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>

        <div
          className={cn(
            'rounded-xl px-4 py-2 break-words',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
          )}
        >
          {message.image_url && (
            <img
              src={message.image_url}
              alt="Shared media"
              className="rounded-lg max-w-full mb-2"
            />
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
