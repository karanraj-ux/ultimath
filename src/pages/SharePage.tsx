import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { chatService } from '@/services/chat.service';
import { Bot, User, Home, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SoloMessage } from '@/types/types';

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sharedChat, setSharedChat] = useState<any>(null);
  const [messages, setMessages] = useState<SoloMessage[]>([]);

  useEffect(() => {
    loadSharedChat();
  }, [slug]);

  const loadSharedChat = async () => {
    try {
      setLoading(true);
      const data = await chatService.getSharedChat(slug!);
      
      if (!data) {
        setSharedChat(null);
        return;
      }

      setSharedChat(data);

      // Load messages
      const messagesData = await chatService.getSharedMessages(data.conversation_id);
      setMessages(messagesData);
    } catch (err) {
      console.error('Failed to load shared chat:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading shared conversation...</p>
      </div>
    );
  }

  if (!sharedChat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <h1 className="text-2xl font-bold">Conversation not found</h1>
        <p className="text-muted-foreground text-center max-w-md">
          This shared conversation doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/')}>
          <Home className="h-4 w-4 mr-2" />
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2 text-balance">
                  {sharedChat.title || 'Shared Conversation'}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {sharedChat.conversation?.model || 'AI Chat'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" />
                    {sharedChat.views_count || 0} views
                  </Badge>
                </div>
              </div>
              <Button onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Create Your Own
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No messages in this conversation</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    isUser && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <Card className={cn('flex-1 max-w-[85%]', isUser && 'bg-primary/5')}>
                    <CardContent className="p-4">
                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Shared"
                          className="rounded-lg max-w-full mb-3 max-h-96 object-contain"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Footer CTA */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Want to create your own AI conversations?</h3>
            <p className="text-sm text-muted-foreground mb-4 text-pretty">
              Start chatting with 20+ AI models, upload images, and share your conversations
            </p>
            <Button size="lg" onClick={() => navigate('/')}>
              Get Started Free
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
