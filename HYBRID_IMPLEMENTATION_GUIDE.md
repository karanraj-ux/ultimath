# Hybrid System Implementation Guide

## Overview
This application now supports BOTH multi-persona group chat AND solo one-on-one chat with advanced features.

## Completed Work

### 1. Database Schema ✅
**Hybrid Structure:**
- **Group Chat Tables:**
  - `personas`: AI personas with 6 prompt sections
  - `groups`: Group configurations with persona IDs
  - `group_messages`: Messages in group chats
  
- **Solo Chat Tables:**
  - `conversations`: Solo chat sessions
  - `solo_messages`: Messages in solo chats
  
- **Shared Tables:**
  - `memory_entries`: Memory for both modes
  - `prompt_templates`: Reusable prompt configurations
  - `api_keys`: API keys for all providers
  - `contacts`: Friends and anonymous contacts
  - `image_generations`: AI-generated images

### 2. Type System ✅
- Expanded to support both group and solo modes
- Added `PromptSections` interface
- Added `MemoryEntry`, `PromptTemplate` types
- Kept `Persona`, `Group`, `GroupMessage` for group chat
- Added `Conversation`, `SoloMessage` for solo chat

### 3. AI Model Support ✅
- 20+ models across 4 providers
- Model configuration in `/src/lib/models.ts`
- Vision support flags for image input

## Implementation Roadmap

### Phase 1: Core Services (HIGH PRIORITY)

#### 1.1 Memory Service
**File**: `/src/services/memory.service.ts`

```typescript
import { supabase } from '@/db/supabase';
import type { MemoryEntry } from '@/types/types';

export const memoryService = {
  // Get memories for conversation
  async getConversationMemories(conversationId: string): Promise<MemoryEntry[]>
  
  // Get memories for persona
  async getPersonaMemories(personaId: string): Promise<MemoryEntry[]>
  
  // Get memories for group
  async getGroupMemories(groupId: string): Promise<MemoryEntry[]>
  
  // Add memory entry
  async addMemory(memory: Omit<MemoryEntry, 'id' | 'created_at'>): Promise<MemoryEntry>
  
  // Get top N important memories
  async getTopMemories(id: string, type: 'conversation' | 'persona' | 'group', limit: number): Promise<MemoryEntry[]>
  
  // Clear memories
  async clearMemories(id: string, type: 'conversation' | 'persona' | 'group'): Promise<void>
};
```

#### 1.2 Prompt Template Service
**File**: `/src/services/prompt-template.service.ts`

```typescript
export const promptTemplateService = {
  async getTemplates(): Promise<PromptTemplate[]>
  async getTemplateById(id: string): Promise<PromptTemplate | null>
  async createTemplate(template: Omit<PromptTemplate, 'id' | 'created_at'>): Promise<PromptTemplate>
  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<void>
  async deleteTemplate(id: string): Promise<void>
};
```

#### 1.3 Update Persona Service
**File**: `/src/services/persona.service.ts`

Add support for 6 prompt sections:
- `prompt_core_personality`
- `prompt_contextual_behavior`
- `prompt_knowledge_domain`
- `prompt_interaction_style`
- `prompt_memory_integration`
- `prompt_emotional_response`

#### 1.4 Update Group Service
**File**: `/src/services/group.service.ts`

Update to use `group_messages` table instead of `messages`.

### Phase 2: Enhanced Edge Functions (HIGH PRIORITY)

#### 2.1 Update Chat Edge Function
**File**: `/supabase/functions/chat/index.ts`

Add support for:
- Memory context in requests
- 6-section prompt system
- Emotional state analysis
- Both group and solo modes

#### 2.2 Group Chat Edge Function
**File**: `/supabase/functions/group-chat/index.ts`

Create new function for group chat that:
- Handles multiple personas responding
- Integrates memory for each persona
- Analyzes emotional states
- Coordinates multi-model responses

### Phase 3: UI Components (HIGH PRIORITY)

#### 3.1 Mode Switcher Component
**File**: `/src/components/ModeSwitcher.tsx`

Toggle between Solo and Group modes:
```tsx
<Tabs value={mode} onValueChange={setMode}>
  <TabsList>
    <TabsTrigger value="solo">Solo Chat</TabsTrigger>
    <TabsTrigger value="group">Group Chat</TabsTrigger>
  </TabsList>
</Tabs>
```

#### 3.2 Advanced Prompt Editor
**File**: `/src/components/persona/PromptEditor.tsx`

6-section prompt editor with:
- Tabs for each section
- Rich text editor
- Character count
- Preview functionality
- Template selector

**Sections:**
1. **Core Personality**: Fundamental character traits
2. **Contextual Behavior**: Situational responses
3. **Knowledge Domain**: Expertise areas
4. **Interaction Style**: Communication patterns
5. **Memory Integration**: How to use past conversations
6. **Emotional Response**: Empathy and emotional intelligence

#### 3.3 Memory Management Component
**File**: `/src/components/memory/MemoryManager.tsx`

Features:
- View memory entries
- Importance scores
- Clear/reset memory
- Memory statistics
- Memory context window slider

#### 3.4 Enhanced Persona Card
**File**: `/src/components/chat/PersonaCard.tsx` (update existing)

Add:
- Model badge
- Memory indicator
- Prompt sections indicator
- Quick edit button

### Phase 4: Pages (HIGH PRIORITY)

#### 4.1 Main Chat Page with Mode Switcher
**File**: `/src/pages/ChatPage.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│ [Solo Chat | Group Chat] [⚙️] [👤]     │ Header
├─────────────────────────────────────────┤
│                                         │
│  {Solo Mode: Direct chat with AI}      │
│  {Group Mode: Multi-persona chat}      │
│                                         │
├─────────────────────────────────────────┤
│ [📎] [🎨] [Type message...] [Send]     │ Input
└─────────────────────────────────────────┘
```

#### 4.2 Enhanced Persona Creation Page
**File**: `/src/pages/PersonaLibraryPage.tsx` (update existing)

Add:
- Advanced prompt editor
- Model selector (all 20+ models)
- Memory settings
- Template selector
- Preview functionality

#### 4.3 Solo Chat Page
**File**: `/src/pages/SoloChatPage.tsx`

Features:
- One-on-one chat interface
- Model selector dropdown
- Memory indicator
- Image upload
- Image generation
- Conversation history sidebar

#### 4.4 Enhanced Group Chat Page
**File**: `/src/pages/GroupChatPage.tsx` (update existing)

Add:
- Multi-model support
- Show which model is responding
- Memory indicators
- Image generation
- Image input
- Better persona status panel

### Phase 5: Hooks (HIGH PRIORITY)

#### 5.1 useMemory Hook
**File**: `/src/hooks/use-memory.ts`

```typescript
export function useMemory(id: string, type: 'conversation' | 'persona' | 'group') {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load memories
  // Add memory
  // Clear memories
  // Get top memories
  
  return { memories, loading, addMemory, clearMemories, getTopMemories };
}
```

#### 5.2 useSoloChat Hook
**File**: `/src/hooks/use-solo-chat.ts`

```typescript
export function useSoloChat(conversationId: string) {
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  const [sending, setSending] = useState(false);
  
  // Load messages
  // Send message
  // Subscribe to realtime
  // Handle image upload
  // Handle image generation
  
  return { messages, sending, sendMessage, uploadImage, generateImage };
}
```

#### 5.3 Update useChat Hook
**File**: `/src/hooks/use-chat.ts` (update existing)

Add support for:
- Memory integration
- Image generation
- Image input
- Multi-model responses

### Phase 6: Design System Upgrade (HIGH PRIORITY)

#### 6.1 Update Color Scheme
**File**: `/src/index.css`

Add sophisticated, market-ready colors:
- Professional gradients
- Subtle shadows
- Smooth transitions
- Modern accent colors
- Better dark mode

#### 6.2 Component Styling
- Polished message bubbles
- Smooth animations
- Professional cards
- Better spacing
- Refined typography

### Phase 7: Features Integration

#### 7.1 Image Generation
- Detect "generate image" in messages
- Call Nano Banana API
- Display inline
- Work in both modes

#### 7.2 Image Input
- Upload button in chat
- Support vision models
- Preview before sending
- Display in chat history

#### 7.3 Rich Media
- Sticker picker
- GIF integration
- Photo library
- Contextual responses

## Testing Checklist

### Group Chat Mode
- [ ] Create personas with 6 prompt sections
- [ ] Create group with multiple personas
- [ ] Send message and get responses from multiple personas
- [ ] Personas show different emotional states
- [ ] Memory persists across sessions
- [ ] Image generation works
- [ ] Image input works
- [ ] Share group code
- [ ] Join group via code

### Solo Chat Mode
- [ ] Start new conversation
- [ ] Select AI model
- [ ] Send messages and get responses
- [ ] Switch models mid-conversation
- [ ] Memory persists
- [ ] Image generation works
- [ ] Image input works
- [ ] Conversation history

### Shared Features
- [ ] Mode switcher works
- [ ] API key management
- [ ] All 20+ models available
- [ ] Memory management
- [ ] Prompt templates
- [ ] Contacts system
- [ ] Rich media
- [ ] Responsive design
- [ ] No lint errors

## Key Implementation Notes

### Prompt System
Each persona has 6 prompt sections that combine to create a sophisticated AI personality:

1. **Core Personality** (Required): Base character
2. **Contextual Behavior** (Optional): Situational responses
3. **Knowledge Domain** (Optional): Expertise
4. **Interaction Style** (Optional): Communication patterns
5. **Memory Integration** (Optional): How to use memories
6. **Emotional Response** (Optional): Empathy settings

When calling AI:
```typescript
const fullPrompt = `
${persona.prompt_core_personality}

${persona.prompt_contextual_behavior ? `Contextual Behavior: ${persona.prompt_contextual_behavior}` : ''}

${persona.prompt_knowledge_domain ? `Knowledge: ${persona.prompt_knowledge_domain}` : ''}

${persona.prompt_interaction_style ? `Style: ${persona.prompt_interaction_style}` : ''}

${memories.length > 0 ? `Memories: ${memories.map(m => m.content).join('\n')}` : ''}

${persona.prompt_emotional_response ? `Emotional Response: ${persona.prompt_emotional_response}` : ''}
`;
```

### Memory System
- Automatically extract important information from conversations
- Store with importance scores (1-10)
- Retrieve top N memories for context
- Integrate with prompt sections
- Clear/reset as needed

### Multi-Model Group Chat
- Each persona can use a different model
- Responses come in asynchronously
- Show loading state per persona
- Handle failures gracefully

## Next Steps

1. Create memory and prompt template services
2. Update persona service with 6 prompt sections
3. Create advanced prompt editor component
4. Build mode switcher
5. Create solo chat page
6. Update group chat page
7. Implement memory management UI
8. Add image generation and input
9. Upgrade design system
10. Test everything
11. Fix lint errors
12. Polish UI/UX

## Market-Ready Checklist

- [ ] Professional, modern UI
- [ ] Smooth animations
- [ ] No bugs or errors
- [ ] All features working
- [ ] Responsive design
- [ ] Clear documentation
- [ ] Easy onboarding
- [ ] Performance optimized
- [ ] Security best practices
- [ ] Error handling
