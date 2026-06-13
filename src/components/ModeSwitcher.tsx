import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare } from 'lucide-react';

interface ModeSwitcherProps {
  mode: 'solo' | 'group';
  onModeChange: (mode: 'solo' | 'group') => void;
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'solo' | 'group')}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="solo" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Solo Chat</span>
        </TabsTrigger>
        <TabsTrigger value="group" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Group Chat</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
