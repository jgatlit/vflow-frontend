export interface ModelInfo {
  id: string;
  name: string;
  tier: 'flagship' | 'fast' | 'premium' | 'experimental' | 'legacy';
  description?: string;
  contextWindow?: number;
  maxOutput?: number;
  pricing?: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    streaming?: boolean;
    json?: boolean;
    extendedThinking?: boolean;
  };
}

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string; // Tailwind color class base
  models: ModelInfo[];
  defaultModel: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    color: 'purple',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: [
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude 4.5 Sonnet',
        tier: 'flagship',
        description: 'Most intelligent model, balanced performance',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude 4.5 Haiku',
        tier: 'fast',
        description: 'Fastest responses, lower cost',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 0.8, output: 4 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        tier: 'premium',
        description: 'Highest intelligence for complex tasks',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 15, output: 75 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-opus-4-1-20250710',
        name: 'Claude Opus 4.1',
        tier: 'premium',
        description: 'Enhanced Opus model',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 15, output: 75 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        tier: 'flagship',
        description: 'Previous generation Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-sonnet-3-7-20250219',
        name: 'Claude 3.7 Sonnet',
        tier: 'legacy',
        description: 'Claude 3.7 series',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-sonnet-3-5-20241022',
        name: 'Claude 3.5 Sonnet',
        tier: 'legacy',
        description: 'Previous generation 3.5',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-sonnet-3-5-20240620',
        name: 'Claude 3.5 Sonnet (Legacy)',
        tier: 'legacy',
        description: 'Original 3.5 release',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: false }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        tier: 'legacy',
        description: 'Claude 3 series high-intelligence',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: { input: 15, output: 75 },
        capabilities: { vision: true, tools: true, streaming: true, json: false }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        tier: 'legacy',
        description: 'Claude 3 series fast model',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: { input: 0.25, output: 1.25 },
        capabilities: { vision: true, tools: true, streaming: true, json: false }
      },
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    color: 'blue',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        tier: 'flagship',
        description: 'Multimodal flagship model',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: { input: 2.5, output: 10 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        tier: 'fast',
        description: 'Affordable and fast',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: { input: 0.15, output: 0.6 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'o1',
        name: 'o1',
        tier: 'premium',
        description: 'Advanced reasoning model',
        contextWindow: 200000,
        maxOutput: 100000,
        pricing: { input: 15, output: 60 },
        capabilities: { tools: false, streaming: false, json: true }
      },
      {
        id: 'o1-mini',
        name: 'o1 Mini',
        tier: 'premium',
        description: 'Faster reasoning model',
        contextWindow: 128000,
        maxOutput: 65536,
        pricing: { input: 3, output: 12 },
        capabilities: { tools: false, streaming: false, json: true }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        tier: 'legacy',
        description: 'Previous generation flagship',
        contextWindow: 128000,
        maxOutput: 4096,
        pricing: { input: 10, output: 30 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        tier: 'legacy',
        description: 'Fast and affordable legacy model',
        contextWindow: 16385,
        maxOutput: 4096,
        pricing: { input: 0.5, output: 1.5 },
        capabilities: { tools: true, streaming: true, json: true }
      },
    ]
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    color: 'green',
    defaultModel: 'gemini-2.0-flash-exp',
    models: [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        tier: 'flagship',
        description: 'Fast multimodal model',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0, output: 0 }, // Free tier
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-exp-1206',
        name: 'Gemini Exp 1206',
        tier: 'experimental',
        description: 'Experimental features',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        tier: 'flagship',
        description: 'Most capable Gemini model',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: { input: 1.25, output: 5 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        tier: 'fast',
        description: 'Fast and efficient',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        tier: 'legacy',
        description: 'Previous generation Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: { input: 1.25, output: 5 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        tier: 'legacy',
        description: 'Previous generation Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
    ]
  }
};

// Helper functions
export function getProvider(providerId: string): ProviderConfig | undefined {
  return PROVIDERS[providerId];
}

export function getModel(providerId: string, modelId: string): ModelInfo | undefined {
  return PROVIDERS[providerId]?.models.find(m => m.id === modelId);
}

export function getDefaultModel(providerId: string): string {
  return PROVIDERS[providerId]?.defaultModel || '';
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

export function supportsTools(providerId: string, modelId: string): boolean {
  const model = getModel(providerId, modelId);
  return model?.capabilities?.tools || false;
}

export function supportsExtendedThinking(providerId: string, modelId: string): boolean {
  const model = getModel(providerId, modelId);
  return model?.capabilities?.extendedThinking || false;
}
