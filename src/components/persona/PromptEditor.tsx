import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { PromptSections } from '@/types/types';

interface PromptEditorProps {
  prompts: PromptSections;
  onChange: (prompts: PromptSections) => void;
}

const PROMPT_SECTIONS = [
  {
    key: 'core_personality' as keyof PromptSections,
    label: 'Core Personality',
    description: 'Fundamental character traits and base personality (Required)',
    placeholder: 'Define the core personality traits, values, and fundamental characteristics...',
    required: true,
    maxLength: 1000,
  },
  {
    key: 'contextual_behavior' as keyof PromptSections,
    label: 'Contextual Behavior',
    description: 'How the AI responds in different situations and contexts',
    placeholder: 'Describe how this AI should behave in various situations, contexts, or scenarios...',
    required: false,
    maxLength: 800,
  },
  {
    key: 'knowledge_domain' as keyof PromptSections,
    label: 'Knowledge Domain',
    description: 'Areas of expertise and specialized knowledge',
    placeholder: 'Specify areas of expertise, specialized knowledge, or domains of competence...',
    required: false,
    maxLength: 800,
  },
  {
    key: 'interaction_style' as keyof PromptSections,
    label: 'Interaction Style',
    description: 'Communication patterns, tone, and conversational style',
    placeholder: 'Define the communication style, tone, formality level, and conversational patterns...',
    required: false,
    maxLength: 800,
  },
  {
    key: 'memory_integration' as keyof PromptSections,
    label: 'Memory Integration',
    description: 'How to use and reference past conversations',
    placeholder: 'Explain how this AI should use memories from past conversations and interactions...',
    required: false,
    maxLength: 600,
  },
  {
    key: 'emotional_response' as keyof PromptSections,
    label: 'Emotional Response',
    description: 'Empathy, emotional intelligence, and affective responses',
    placeholder: 'Define how this AI should handle emotions, show empathy, and respond emotionally...',
    required: false,
    maxLength: 600,
  },
];

export function PromptEditor({ prompts, onChange }: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState('core_personality');

  const handleChange = (key: keyof PromptSections, value: string) => {
    onChange({
      ...prompts,
      [key]: value,
    });
  };

  const getCharCount = (key: keyof PromptSections) => {
    return prompts[key]?.length || 0;
  };

  const getFilledSections = () => {
    return PROMPT_SECTIONS.filter(section => prompts[section.key]?.trim()).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Advanced Prompt Configuration</CardTitle>
            <CardDescription>
              Create a sophisticated AI personality with multiple prompt sections
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {getFilledSections()}/{PROMPT_SECTIONS.length} sections
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {PROMPT_SECTIONS.map(section => (
              <TabsTrigger
                key={section.key}
                value={section.key}
                className="relative"
              >
                {section.label.split(' ')[0]}
                {section.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
                {prompts[section.key]?.trim() && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {PROMPT_SECTIONS.map(section => (
            <TabsContent key={section.key} value={section.key} className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {section.description}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={section.key}>
                    {section.label}
                    {section.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {getCharCount(section.key)}/{section.maxLength}
                  </span>
                </div>
                <Textarea
                  id={section.key}
                  value={prompts[section.key] || ''}
                  onChange={(e) => handleChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                  rows={8}
                  maxLength={section.maxLength}
                  className="resize-none"
                />
              </div>

              {section.key === 'core_personality' && !prompts.core_personality?.trim() && (
                <div className="text-sm text-destructive">
                  Core Personality is required to create a functional AI persona
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <strong>Tip:</strong> Fill in as many sections as possible to create a more sophisticated and "soulful" AI personality. 
          The more detailed your prompts, the better the AI will understand how to behave.
        </div>
      </CardContent>
    </Card>
  );
}
