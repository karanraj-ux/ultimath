import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Persona } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Sword, Sparkles, Globe, Link2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type RoomType = 'public' | 'semi-private' | 'private';

const ROOM_TYPES: { value: RoomType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'public',       label: 'Public',       desc: 'Anyone with the code can join',    icon: <Globe className="h-4 w-4" /> },
  { value: 'semi-private', label: 'Semi-private', desc: 'Anyone with the invite link',      icon: <Link2 className="h-4 w-4" /> },
  { value: 'private',      label: 'Private',      desc: 'Invite only',                      icon: <Lock  className="h-4 w-4" /> },
];

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function NewGroupCreationPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('public');
  const [displayName, setDisplayName] = useState('');
  const [personaId, setPersonaId] = useState<string>('none');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPersonas(); }, []);

  const loadPersonas = async () => {
    try {
      const { data } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: false });
      setPersonas(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  const handleCreate = async () => {
    if (!topic.trim()) { toast.error('Room topic is required'); return; }
    if (!displayName.trim()) { toast.error('Your display name is required'); return; }
    setSaving(true);
    try {
      const selectedPersona = personas.find(p => p.id === personaId);
      const code = generateCode();

      const { data: room, error } = await supabase
        .from('groups')
        .insert({
          name: topic.trim(),
          topic: topic.trim(),
          description: description.trim() || null,
          join_code: code,
          room_type: roomType,
          invite_link_enabled: true,
          persona_id: selectedPersona ? selectedPersona.id : null,
          ai_persona_name: selectedPersona ? selectedPersona.name : 'Forge AI',
          ai_model: 'gemini-2.5-flash',
          ai_system_prompt: selectedPersona?.system_prompt ?? '',
        })
        .select()
        .single();

      if (error) throw error;

      sessionStorage.setItem(`forge_room_${room.id}_name`, displayName.trim());
      sessionStorage.setItem(`forge_room_${room.id}_session`, generateCode());

      toast.success('Room created!', { description: `Join code: ${code}` });
      navigate(`/room/${room.id}`);
    } catch (err: unknown) {
      toast.error('Failed to create room', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky nav bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Sword className="h-4 w-4 text-primary shrink-0" />
            <h1 className="font-bold truncate">Create Debate Room</h1>
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.10) 0%, hsl(22 90% 50% / 0.06) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.25) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }} />
        <div className="relative max-w-2xl mx-auto px-4 py-8 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-150"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(22 90% 50%))' }} />
            <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.35)]"
              style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(22 90% 50%))' }}>
              <Sword className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-balance">Create a Debate Room</h2>
              <span className="badge-beta">Beta</span>
            </div>
            <p className="text-sm text-muted-foreground text-pretty leading-relaxed max-w-md">
              Set a topic, invite participants, and let AI fact-check every claim in real-time.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-normal">Room Topic <span className="text-destructive">*</span></Label>
          <Input
            id="topic"
            placeholder="e.g. Was the moon landing faked?"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">This becomes the debate subject for AI fact-checking context.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-normal">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea
            id="description"
            placeholder="Provide context or rules for this debate room…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            maxLength={400}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-normal">Access Type <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {ROOM_TYPES.map(rt => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRoomType(rt.value)}
                className={cn(
                  'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                  roomType === rt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-accent'
                )}
              >
                <div className={cn('flex items-center gap-1.5 font-medium text-sm', roomType === rt.value ? 'text-primary' : 'text-foreground')}>
                  {rt.icon}
                  {rt.label}
                </div>
                <p className="text-[11px] text-muted-foreground">{rt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-normal">Your Display Name <span className="text-destructive">*</span></Label>
          <Input
            id="displayName"
            placeholder="e.g. Alex, DebaterX…"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={40}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-normal flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Add AI Persona to Room <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Select value={personaId} onValueChange={setPersonaId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a persona…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No AI persona</SelectItem>
              {personas.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.emoji_avatar ?? '🤖'} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The persona will join as an AI participant in the room.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/rooms')} disabled={saving} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !topic.trim() || !displayName.trim()} className="flex-1">
            {saving ? 'Creating…' : 'Create Room'}
          </Button>
        </div>
      </div>
    </div>
  );
}
