import type { AIModel, AIProvider, ModelInfo } from '@/types/types';

export const AI_MODELS: Record<AIModel, ModelInfo> = {
  // OpenAI Models
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    supportsVision: false,
    contextWindow: 8192,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    supportsVision: true,
    contextWindow: 128000,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    supportsVision: true,
    contextWindow: 128000,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    supportsVision: true,
    contextWindow: 128000,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    supportsVision: false,
    contextWindow: 16385,
  },

  // Gemini Models
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    supportsVision: true,
    contextWindow: 1000000,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    supportsVision: true,
    contextWindow: 2000000,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    supportsVision: true,
    contextWindow: 1000000,
  },

  // Groq Models
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    supportsVision: false,
    contextWindow: 32768,
  },
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    supportsVision: false,
    contextWindow: 8192,
  },
  'mixtral-8x7b-32768': {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    supportsVision: false,
    contextWindow: 32768,
  },
  'gemma-2-9b-it': {
    id: 'gemma-2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'groq',
    supportsVision: false,
    contextWindow: 8192,
  },

  // Claude Models
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    supportsVision: true,
    contextWindow: 200000,
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    supportsVision: true,
    contextWindow: 200000,
  },
  'claude-3-sonnet-20240229': {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'claude',
    supportsVision: true,
    contextWindow: 200000,
  },
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    supportsVision: true,
    contextWindow: 200000,
  },
};

export const MODELS_BY_PROVIDER: Record<AIProvider, ModelInfo[]> = {
  openai: [
    AI_MODELS['gpt-4o'],
    AI_MODELS['gpt-4o-mini'],
    AI_MODELS['gpt-4-turbo'],
    AI_MODELS['gpt-4'],
    AI_MODELS['gpt-3.5-turbo'],
  ],
  gemini: [
    AI_MODELS['gemini-2.5-flash'],
    AI_MODELS['gemini-1.5-pro'],
    AI_MODELS['gemini-1.5-flash'],
  ],
  groq: [
    AI_MODELS['llama-3.3-70b-versatile'],
    AI_MODELS['llama-3.1-8b-instant'],
    AI_MODELS['mixtral-8x7b-32768'],
    AI_MODELS['gemma-2-9b-it'],
  ],
  claude: [
    AI_MODELS['claude-3-5-sonnet-20241022'],
    AI_MODELS['claude-3-opus-20240229'],
    AI_MODELS['claude-3-sonnet-20240229'],
    AI_MODELS['claude-3-haiku-20240307'],
  ],
  nano_banana: [],
};

export const DEFAULT_MODEL: AIModel = 'gpt-4o-mini';

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  groq: 'Groq',
  claude: 'Anthropic Claude',
  nano_banana: 'Nano Banana (Image Generation)',
};
