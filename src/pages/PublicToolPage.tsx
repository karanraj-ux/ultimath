import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Send, Square, AlertCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicChat } from '@/hooks/use-public-chat';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ToolInfo {
  persona_name: string;
  persona_description: string;
  persona_avatar: string;
}

export default function PublicToolPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [toolInfo, setToolInfo] = useState<ToolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { messages, sending, error: chatError, sendMessage, stopGeneration } = usePublicChat(shareToken || '');
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid tool link.');
      setLoading(false);
      return;
    }

    async function loadTool() {
      const { data, error } = await supabase
        .from('public_tool_details')
        .select('*')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (error || !data) {
        setError('This tool is unavailable, deleted, or you have the wrong link.');
      } else {
        setToolInfo(data);
      }
      setLoading(false);
    }
    loadTool();
  }, [shareToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-background"><div className="animate-pulse flex flex-col items-center gap-4"><Bot className="h-8 w-8 text-muted-foreground" /><p>Loading tool...</p></div></div>;
  }

  if (error || !toolInfo) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tool Unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || sending) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-dvh bg-background max-w-3xl mx-auto border-x border-border shadow-2xl relative">
      {/* Header */}
      <div className="shrink-0 h-16 border-b border-border flex items-center px-4 md:px-6 bg-card z-10">
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-xl mr-3 border border-primary/20">
          {toolInfo.persona_avatar || '🤖'}
        </div>
        <div>
          <h1 className="font-semibold">{toolInfo.persona_name}</h1>
          <p className="text-xs text-muted-foreground line-clamp-1">{toolInfo.persona_description}</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-3xl">
              {toolInfo.persona_avatar || '🤖'}
            </div>
            <p className="max-w-xs text-sm">Send a message to start chatting with {toolInfo.persona_name}.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
               {msg.role === 'assistant' && (
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-sm">
                   {toolInfo.persona_avatar || '🤖'}
                 </div>
               )}
               <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                 <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                 {msg.isStreaming && <span className="inline-block w-2 h-4 bg-foreground/40 animate-pulse ml-1 align-middle" />}
               </div>
            </div>
          ))
        )}
        {chatError && (
          <div className="text-destructive text-xs text-center p-2 bg-destructive/10 rounded-lg">
            {chatError}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2 bg-muted/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 max-h-32 min-h-10 bg-transparent border-0 resize-none px-3 py-2 text-sm focus:ring-0"
            rows={1}
          />
          {sending ? (
            <Button size="icon" variant="destructive" onClick={stopGeneration} className="h-10 w-10 shrink-0 rounded-xl">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-10 w-10 shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="text-center mt-3 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          Powered by <Bot className="h-3 w-3" /> Forge Tools
        </div>
      </div>
    </div>
  );
}
