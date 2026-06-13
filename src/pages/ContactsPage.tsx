import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { contactService } from '@/services/contact.service';
import { UserPlus, Users, Trash2, Search, ArrowLeft, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types/types';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className="forge-card p-4 flex items-center gap-4">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────
function ContactCard({ contact, onDelete }: { contact: Contact; onDelete: () => void }) {
  return (
    <div className="forge-card forge-card-hover p-4 flex items-center gap-3 group">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={contact.avatar_url ?? ''} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
          {contact.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{contact.name}</p>
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
          contact.type === 'friend'
            ? 'bg-[hsl(152_68%_44%/0.1)] text-[hsl(152_68%_44%)] border-[hsl(152_68%_44%/0.3)]'
            : 'bg-muted text-muted-foreground border-border',
        )}>
          {contact.type === 'friend' ? '● Friend' : '○ Anonymous'}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'friend' | 'anonymous'>('friend');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setContacts(await contactService.getContacts());
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Enter a name'); return; }
    try {
      setSubmitting(true);
      await contactService.createContact(name.trim(), type, avatarUrl || undefined);
      toast.success('Contact added');
      setName(''); setType('friend'); setAvatarUrl('');
      setShowAddDialog(false);
      loadContacts();
    } catch { toast.error('Failed to add contact'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await contactService.deleteContact(deleteId);
      toast.success('Contact removed');
      setDeleteId(null);
      loadContacts();
    } catch { toast.error('Failed to delete contact'); }
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const friends   = filtered.filter(c => c.type === 'friend');
  const anon      = filtered.filter(c => c.type === 'anonymous');

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <h1 className="font-bold truncate">Contacts</h1>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 h-8 shrink-0">
            <UserPlus className="h-3.5 w-3.5" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.07) 0%, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-pretty max-w-lg">
            Track friends and anonymous participants across your debate rooms and conversations.
          </p>
          <div className="flex gap-3 shrink-0">
            <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Total" value={contacts.length} color="bg-primary/10" />
            <StatCard icon={<UserCheck className="h-5 w-5 text-[hsl(152_68%_44%)]" />} label="Friends" value={contacts.filter(c => c.type === 'friend').length} color="bg-[hsl(152_68%_44%/0.1)]" />
            <StatCard icon={<UserX className="h-5 w-5 text-muted-foreground" />} label="Anon" value={contacts.filter(c => c.type === 'anonymous').length} color="bg-muted" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts…"
            className="pl-10 h-10"
          />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="forge-card p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-primary/60" />
            </div>
            <p className="font-semibold mb-1">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="text-sm text-muted-foreground mb-5 text-pretty max-w-xs mx-auto">
              {searchQuery ? 'Try a different search term.' : 'Add friends or track anonymous participants in your rooms.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)} className="gap-1.5">
                <UserPlus className="h-4 w-4" /> Add First Contact
              </Button>
            )}
          </div>
        )}

        {/* Friends section */}
        {!loading && friends.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5" /> Friends ({friends.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map(c => (
                <ContactCard key={c.id} contact={c} onDelete={() => setDeleteId(c.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Anonymous section */}
        {!loading && anon.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <UserX className="h-3.5 w-3.5" /> Anonymous ({anon.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {anon.map(c => (
                <ContactCard key={c.id} contact={c} onDelete={() => setDeleteId(c.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a friend or anonymous participant to your contacts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <Label htmlFor="name" className="text-sm font-normal mb-1.5 block">Name *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name…" autoFocus className="h-10" />
            </div>
            <div>
              <Label htmlFor="type" className="text-sm font-normal mb-1.5 block">Type *</Label>
              <Select value={type} onValueChange={(v: 'friend' | 'anonymous') => setType(v)}>
                <SelectTrigger id="type" className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="avatar" className="text-sm font-normal mb-1.5 block">Avatar URL (optional)</Label>
              <Input id="avatar" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" className="h-10" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Contact'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this contact. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
