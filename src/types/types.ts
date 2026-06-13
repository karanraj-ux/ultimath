// AI Provider types
export type AIProvider = 'openai' | 'gemini' | 'groq' | 'claude' | 'nano_banana';

// Emotional states
export type EmotionalState = 'happy' | 'angry' | 'sad' | 'neutral' | 'excited' | 'frustrated' | 'trusting' | 'suspicious';

// Specific AI Models
export type AIModel =
  // OpenAI models
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-3.5-turbo'
  // Gemini models
  | 'gemini-2.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  // Groq models
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'mixtral-8x7b-32768'
  | 'gemma-2-9b-it'
  // Claude models
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export interface ModelInfo {
  id: AIModel;
  name: string;
  provider: AIProvider;
  supportsVision: boolean;
  contextWindow: number;
}

// Prompt Sections
export interface PromptSections {
  core_personality?: string;
  contextual_behavior?: string;
  knowledge_domain?: string;
  interaction_style?: string;
  memory_integration?: string;
  emotional_response?: string;
}

// Persona (for group chat + Phase 1 creator)
export interface Persona extends PromptSections {
  id: string;
  name: string;
  personality_profile: string;
  system_prompt: string;
  emotional_state: EmotionalState;
  ai_model: AIModel;
  avatar_url?: string;
  is_public: boolean;
  // Phase 1 fields
  tone?: 'friendly' | 'professional' | 'blunt' | 'playful' | 'socratic';
  emoji_avatar?: string;
  knowledge_domain?: string;
  memory_enabled?: boolean;
  description?: string;
  prompt_core_personality?: string;
  prompt_contextual_behavior?: string;
  prompt_knowledge_domain?: string;
  prompt_interaction_style?: string;
  prompt_memory_integration?: string;
  prompt_emotional_response?: string;
  // Phase 3 fields
  personality_traits?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Persona stat summary (from DB view)
export interface PersonaStatSummary {
  persona_id: string;
  name: string;
  emoji_avatar: string;
  is_public: boolean;
  created_at: string;
  total_views: number;
  total_chats: number;
  total_messages: number;
  unique_visitors: number;
}

// Group (Multi-user discussion room with ONE AI)
export interface Group {
  id: string;
  name: string;
  description?: string;
  join_code: string;
  // Phase 2 fields
  topic?: string;
  room_type?: 'public' | 'semi-private' | 'private';
  persona_id?: string;
  participant_count?: number;
  invite_link_enabled?: boolean;
  // AI Configuration
  ai_model: AIModel;
  ai_persona_name: string;
  ai_system_prompt: string;
  ai_prompt_core_personality?: string;
  ai_prompt_contextual_behavior?: string;
  ai_prompt_knowledge_domain?: string;
  ai_prompt_interaction_style?: string;
  ai_prompt_memory_integration?: string;
  ai_prompt_emotional_response?: string;
  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Verdict (immutable fact-check result)
export interface Verdict {
  id: string;
  group_id: string;
  message_id: string;
  verdict_text: string;
  verdict_status: 'verified' | 'disputed' | 'unverifiable';
  sources: Array<{ url: string; title: string }>;
  requested_by: string;
  created_at: string;
}

// Group Member
export interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string;
  display_name: string;
  is_anonymous: boolean;
  joined_at: string;
}

// Group Message
export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id?: string;
  sender_type: 'user' | 'ai';
  sender_name: string;
  content: string;
  image_url?: string;
  // Phase 2 fields
  sender_session_id?: string;
  is_anonymous?: boolean;
  is_ai?: boolean;
  created_at: string;
}

// Conversation (for solo chat)
export interface Conversation {
  id: string;
  title: string | null;
  model: AIModel;
  persona_id?: string;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Solo Message
export interface SoloMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  image_url?: string;
  created_at: string;
}

// Memory Entry
export interface MemoryEntry {
  id: string;
  conversation_id?: string;
  persona_id?: string;
  group_id?: string;
  content: string;
  context?: string;
  importance_score: number;
  created_at: string;
}

// Prompt Template
export interface PromptTemplate extends PromptSections {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
}

// Contact
export interface Contact {
  id: string;
  name: string;
  type: 'friend' | 'anonymous';
  avatar_url?: string;
  created_at: string;
}

// Image Generation
export interface ImageGeneration {
  id: string;
  conversation_id?: string;
  group_id?: string;
  prompt: string;
  image_url: string;
  provider: string;
  created_at: string;
}

// API Key
export interface APIKey {
  id: string;
  provider: AIProvider;
  key_encrypted: string;
  model_name?: string;
  is_default: boolean;
  created_at: string;
}

// Chat context for AI
export interface ChatContext {
  messages: (GroupMessage | SoloMessage)[];
  model: AIModel;
  systemPrompt?: string;
  memory?: MemoryEntry[];
}

// AI Request Payload
export interface AIRequestPayload {
  model: AIModel;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    image_url?: string;
  }>;
  systemPrompt?: string;
  memory?: MemoryEntry[];
}

// AI Response
export interface AIResponse {
  content: string;
  model: string;
  emotional_state?: EmotionalState;
}

// ── Agent Pipeline ────────────────────────────────────────────────────────────

/** Collaboration modes for multi-agent pipelines */
export type CollabMode = 'sequential' | 'roundtable' | 'swarm' | 'story';

/** One step in a pipeline — a persona playing a specific role */
export interface PipelineStep {
  step_index: number;
  persona_id?: string;       // if linked to a real persona
  persona_name: string;
  persona_emoji: string;
  role: string;              // e.g. "Research Specialist"
  instruction: string;       // step-specific directive
  model: string;             // AI model for this step
  system_prompt?: string;    // persona system_prompt (populated at runtime)
}

/** Saved pipeline definition */
export interface AgentPipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  is_template: boolean;
  template_type?: string;
  category?: string;
  emoji?: string;
  clone_count?: number;
  created_at: string;
  updated_at: string;
}

/** Anonymous star rating for a template */
export interface TemplateRating {
  id: string;
  template_id: string;
  template_type: 'builtin' | 'user';
  user_fingerprint: string;
  rating: number;
  created_at: string;
}

/** Aggregated rating info for display */
export interface RatingStats {
  average: number;
  count: number;
  userRating: number | null; // current user's own rating
}

/** Output produced by one step during a run */
export interface PipelineStepOutput {
  step_index: number;
  agent_name: string;
  agent_emoji: string;
  role: string;
  content: string;
  model: string;
  duration_ms: number;
}

/** A pipeline execution record */
export interface PipelineRun {
  id: string;
  pipeline_id?: string;
  pipeline_name: string;
  input_prompt: string;
  steps_output: PipelineStepOutput[];
  final_output: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

/** SSE event emitted by run-pipeline edge function */
export type PipelineSSEEvent =
  | { type: 'step_start';    step: number; agent_name: string; agent_emoji: string; role: string }
  | { type: 'token';         step: number; content: string }
  | { type: 'step_done';     step: number; full_content: string; duration_ms: number }
  | { type: 'pipeline_done'; run_id: string; final_output: string }
  | { type: 'swarm_start';   agents: Array<{ step: number; name: string; emoji: string }> }
  | { type: 'error';         message: string };

// ── Group Chat ────────────────────────────────────────────────────────────────

/** A persona configured for group chat */
export interface GroupChatPersona {
  id: string;
  name: string;
  emoji: string;
  system_prompt: string;
  model: string;
  color: string;
}

/** One message in a group chat thread */
export interface GroupChatMessage {
  id: string;
  role: 'user' | 'assistant';
  persona_id?: string;
  persona_name?: string;
  persona_emoji?: string;
  persona_color?: string;
  content: string;
  timestamp: string;
}

/** Saved group chat session */
export interface GroupChatSession {
  id: string;
  title: string;
  persona_ids: string[];
  personas: GroupChatPersona[];
  messages: GroupChatMessage[];
  created_at: string;
  updated_at: string;
}

/** SSE event emitted by group-chat edge function */
export type GroupChatSSEEvent =
  | { type: 'persona_start'; persona_id: string; persona_name: string; persona_emoji: string; persona_color: string }
  | { type: 'token';         persona_id: string; content: string }
  | { type: 'persona_done';  persona_id: string; persona_name: string; full_content: string; duration_ms: number }
  | { type: 'persona_error'; persona_id: string; persona_name: string; message: string }
  | { type: 'session_done' }
  | { type: 'error';         message: string };

