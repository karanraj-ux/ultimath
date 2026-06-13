import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiKeyService } from '@/services/apikey.service';
import type { APIKey, AIProvider } from '@/types/types';

const providerLabels: Record<AIProvider, string> = {
  openai: 'OpenAI (GPT)',
  gemini: 'Google Gemini',
  groq: 'Groq',
  claude: 'Anthropic Claude',
  nano_banana: 'Nano Banana (Image Generation)',
};

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form state
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [key, setKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const data = await apiKeyService.getAPIKeys();
      setApiKeys(data);
    } catch (err) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      setSubmitting(true);
      await apiKeyService.createAPIKey(provider, key, isDefault);
      toast.success('API key added successfully');
      setKey('');
      setProvider('openai');
      setIsDefault(false);
      setShowAddForm(false);
      fetchAPIKeys();
    } catch (err) {
      toast.error('Failed to add API key');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await apiKeyService.deleteAPIKey(deleteId);
      toast.success('API key deleted');
      setDeleteId(null);
      fetchAPIKeys();
    } catch (err) {
      toast.error('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">API Key Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI provider API keys for persona interactions
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Key
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New API Key</CardTitle>
              <CardDescription>
                Enter your API key for an AI provider. Keys are stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providerLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key">API Key</Label>
                  <Input
                    id="key"
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                  <Label htmlFor="default" className="cursor-pointer">
                    Set as default provider
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add API Key'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setKey('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading API keys...
              </CardContent>
            </Card>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No API keys configured. Add your first key to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {providerLabels[apiKey.provider]}
                          </h3>
                          {apiKey.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-muted-foreground font-mono">
                            {visibleKeys.has(apiKey.id)
                              ? apiKey.key_encrypted
                              : maskKey(apiKey.key_encrypted)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeleteId(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? Personas using this provider will not be able to generate responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
