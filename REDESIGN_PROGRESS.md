# Redesign Progress Report

## Completed Work

### 1. Database Restructure ✅
- Removed old tables: personas, groups, persona_memories, memories
- Created new simplified schema:
  - `conversations`: Store chat sessions
  - `messages`: Simplified message structure (role, content, image_url)
  - `contacts`: Friends and anonymous contacts
  - `image_generations`: Track AI-generated images
- Updated `api_keys` table to support nano_banana provider
- Enabled Realtime for messages table

### 2. Type System Update ✅
- Expanded AIModel type to include all major models:
  - OpenAI: GPT-4, GPT-4-turbo, GPT-4o, GPT-4o-mini, GPT-3.5-turbo
  - Gemini: 2.5 Flash, 1.5 Pro, 1.5 Flash
  - Groq: Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma 2 9B
  - Claude: 3.5 Sonnet, 3 Opus, 3 Sonnet, 3 Haiku
- Created ModelInfo interface with vision support flags
- Simplified message and conversation types

### 3. Model Configuration ✅
- Created `/src/lib/models.ts` with complete model catalog
- Defined model capabilities (vision support, context windows)
- Organized models by provider

### 4. Edge Functions ✅
- **chat**: Unified AI chat endpoint supporting all models
  - OpenAI with vision support
  - Gemini with vision support
  - Groq (text only)
  - Claude with vision support
- **generate-image**: Nano Banana image generation integration

### 5. Services Layer ✅
- `chatService`: Conversation and message management, AI chat, Realtime subscriptions
- `imageService`: Image generation via Nano Banana
- `contactService`: Friend and anonymous contact management
- `apiKeyService`: Already exists, supports all providers

## Remaining Work

### 6. Main Chat Interface (HIGH PRIORITY)
**File**: `/src/pages/ChatPage.tsx`

**Requirements:**
- Clean, modern UI like ChatGPT
- Full-screen chat interface (no sidebars by default)
- Message display area with user/assistant bubbles
- Input field at bottom with send button
- Model selector dropdown in header
- Image upload button
- Settings/API key button in header
- No onboarding screens - direct to chat

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Model Selector ▼] [⚙️] [👤]           │ Header
├─────────────────────────────────────────┤
│                                         │
│  User: Hello                            │
│                                         │
│         Assistant: Hi! How can I help?  │
│                                         │
│  User: Generate an image of a cat       │
│                                         │
│         Assistant: [Generated Image]    │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [📎] [Type a message...] [Send]        │ Input
└─────────────────────────────────────────┘
```

### 7. API Key Management Modal (HIGH PRIORITY)
**File**: `/src/components/APIKeyModal.tsx`

**Requirements:**
- Simple modal interface
- List all providers: OpenAI, Gemini, Groq, Claude, Nano Banana
- Input field for each provider
- Save button
- Clear error messages if validation fails
- Show which providers have keys configured

### 8. Hooks (HIGH PRIORITY)
**Files needed:**
- `/src/hooks/use-chat.ts`: Manage current conversation, send messages, handle responses
- `/src/hooks/use-conversations.ts`: List and manage conversations
- `/src/hooks/use-contacts.ts`: Manage contacts

### 9. Components (MEDIUM PRIORITY)
**Files needed:**
- `/src/components/chat/MessageBubble.tsx`: Display user/assistant messages
- `/src/components/chat/ModelSelector.tsx`: Dropdown to switch models
- `/src/components/chat/ImageUpload.tsx`: Upload images for vision models
- `/src/components/chat/ConversationList.tsx`: Sidebar with conversation history
- `/src/components/contacts/ContactList.tsx`: List of friends/anonymous contacts

### 10. Design System Update (MEDIUM PRIORITY)
Update `/src/index.css` with ChatGPT-like colors:
- Clean white/dark backgrounds
- Subtle message bubbles
- Smooth transitions
- Modern, minimal aesthetic

### 11. Routes Update (HIGH PRIORITY)
Update `/src/routes.tsx`:
- Main route `/` → ChatPage (direct chat interface)
- Remove old persona/group routes
- Add `/settings` for API keys and preferences

## Key Implementation Notes

### Chat Flow
1. User opens app → Immediately see chat interface
2. If no API keys → Show modal to add keys
3. User types message → Send to current model
4. Response streams back → Display in chat
5. User can switch models anytime via dropdown

### Image Generation Flow
1. User types "generate image of X"
2. Detect image generation intent
3. Call generate-image Edge Function
4. Display generated image inline in chat

### Image Input Flow
1. User clicks upload button
2. Select image file
3. Convert to base64 or upload to Supabase Storage
4. Send image URL with message to vision-capable model
5. Display image and response in chat

### Model Switching
- Dropdown in header shows all available models
- Grouped by provider
- Disabled if no API key for that provider
- Switching changes model for current conversation

## Testing Checklist

- [ ] Can add API keys for all providers
- [ ] Can send messages and receive responses
- [ ] Can switch between models
- [ ] Can upload images (vision models)
- [ ] Can generate images (Nano Banana)
- [ ] Messages persist in database
- [ ] Realtime updates work
- [ ] Error messages are clear
- [ ] UI is responsive (mobile + desktop)
- [ ] No onboarding screens

## Known Issues to Fix

1. Old service files (persona.service.ts, group.service.ts, message.service.ts) need to be removed
2. Old hooks (use-personas.ts, use-groups.ts) need to be removed
3. Old components (PersonaCard, MoodIndicator) need to be removed or repurposed
4. Old pages need to be removed
5. Routes need complete overhaul

## Next Steps

1. Create main ChatPage with direct interface
2. Create APIKeyModal component
3. Create use-chat hook
4. Update routes to use new pages
5. Test end-to-end flow
6. Fix any lint errors
7. Polish UI/UX

## Reference: Kai9000 Features to Match

Based on user feedback, Kai9000 has:
- Direct chat interface (no setup)
- Pre-configured prompts (can be modified)
- Multiple AI model support
- Simple API key management
- Clean, modern UI
- No complex onboarding

Our implementation should match or exceed these features.
