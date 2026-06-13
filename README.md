# Multi-Persona AI Chat Platform

A dynamic multi-person AI chatbot application featuring emotionally complex AI personas that interact in group chat environments. Built with React, TypeScript, Supabase, and supporting multiple AI backends (OpenAI, Gemini, Groq, Claude) through a Bring-Your-Own-Key (BYOK) model.

## Features

### Core Functionality

- **BYOK System**: Securely manage API keys for multiple AI providers (OpenAI, Gemini, Groq, Claude)
- **Dynamic Personas**: Create AI personas with unique personalities, emotional states, and unfiltered communication styles
- **Group Chat**: Host conversations with 3-5 AI personas interacting with each other and you
- **Emotional States**: Personas exhibit dynamic moods (happy, angry, sad, neutral, excited, frustrated, trusting, suspicious) that influence their responses
- **Real-time Updates**: Live message streaming using Supabase Realtime
- **Single Person Mode**: Focus on one-on-one conversations with selected personas
- **Group Sharing**: Generate and share 6-digit codes to replicate group configurations

### Advanced Features

- **Inter-Persona Dynamics**: Personas form alliances, argue, keep secrets, and gossip
- **Memory Integration**: Import conversation history from other AI services for persona adaptation
- **Unfiltered Communication**: Authentic, raw interactions without sanitization
- **Rich Media Support**: GIFs, images, stickers, and memes in conversations
- **Social Sharing**: Export conversation snippets for social media

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Realtime, Edge Functions)
- **AI Integration**: OpenAI GPT, Google Gemini, Groq, Anthropic Claude
- **State Management**: React Hooks, Context API

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- API keys for at least one AI provider:
  - OpenAI: https://platform.openai.com/api-keys
  - Google Gemini: https://makersuite.google.com/app/apikey
  - Groq: https://console.groq.com/keys
  - Anthropic Claude: https://console.anthropic.com/

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. The Supabase backend is already configured with:
   - Database schema (personas, groups, messages, memories, API keys)
   - Row Level Security policies
   - Edge Functions for AI integrations
   - Realtime subscriptions

4. Start the development server:
   ```bash
   pnpm dev
   ```

### First-Time Setup

1. **Add API Keys**: Navigate to "API Keys" page and add your AI provider keys
2. **Create Personas**: Go to "Personas" page and create 3-5 personas with different personalities
3. **Create Group**: Use "Create Group" to select personas and generate a group chat
4. **Start Chatting**: Send messages and watch personas interact dynamically

## Application Structure

### Pages

- **Home** (`/`): Dashboard with quick stats and actions
- **API Keys** (`/api-keys`): Manage AI provider API keys
- **Personas** (`/personas`): Create and manage AI personas
- **Create Group** (`/groups/create`): Configure and share group chats
- **Group Chat** (`/chat/:groupId`): Main chat interface with three-column layout
- **Settings** (`/settings`): Application preferences

### Key Components

- **PersonaCard**: Display persona with mood indicator and details
- **ChatMessage**: Message bubble with sender info and emotional state
- **MoodIndicator**: Visual representation of persona's current mood

### Services

- **aiService**: AI provider integration and response generation
- **personaService**: Persona CRUD operations
- **groupService**: Group management and code generation
- **messageService**: Message handling and real-time subscriptions
- **apiKeyService**: API key management

## Database Schema

### Tables

- **api_keys**: User API keys for AI providers
- **personas**: AI persona configurations
- **groups**: Group chat configurations
- **messages**: Chat messages with metadata
- **memories**: Imported conversation history
- **persona_memories**: Links personas to memories with analysis

## AI Integration

The application uses Supabase Edge Functions to call different AI providers:

- **OpenAI**: GPT-4o-mini model
- **Gemini**: Gemini-1.5-flash model
- **Groq**: Llama-3.3-70b-versatile model
- **Claude**: Claude-3-5-sonnet model

Each persona can use a different AI model, allowing diverse interaction styles in the same group.

## Emotional State System

Personas dynamically change emotional states based on:
- Conversation context
- Inter-persona interactions
- Response content analysis

Mood colors:
- Happy: Green
- Excited: Amber
- Neutral: Gray
- Sad: Blue
- Angry: Red
- Frustrated: Orange
- Trusting: Dark Green
- Suspicious: Purple

## Security

- API keys are stored in Supabase with Row Level Security
- All database operations require authentication
- Edge Functions handle sensitive AI API calls
- No API keys exposed to client-side code

## Future Enhancements

- Voice input/output for messages
- Advanced memory analysis and personality adaptation
- Meme voice clips integration
- Enhanced social sharing with image generation
- Community persona marketplace
- Multi-user group chats (human + AI)

## Contributing

This is a demonstration project showcasing advanced AI chat capabilities. Feel free to fork and extend!

## License

MIT License - See LICENSE file for details
