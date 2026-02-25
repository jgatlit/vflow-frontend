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
    defaultModel: 'claude-sonnet-4-5',
    models: [
      // Claude 4.5 Series (Latest - November 2025)
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        tier: 'premium',
        description: 'Latest flagship with agent teams capability',
        contextWindow: 200000,
        maxOutput: 128000,
        pricing: { input: 5, output: 25 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'claude-opus-4-5',
        name: 'Claude Opus 4.5',
        tier: 'premium',
        description: 'Most intelligent, effort parameter for cost control',
        contextWindow: 200000,
        maxOutput: 64000,
        pricing: { input: 5, output: 25 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        tier: 'flagship',
        description: 'Best coding model, complex agents',
        contextWindow: 200000,
        maxOutput: 64000,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        tier: 'fast',
        description: 'Fastest responses, near-frontier performance',
        contextWindow: 200000,
        maxOutput: 64000,
        pricing: { input: 1, output: 5 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Claude 4 Series
      {
        id: 'claude-opus-4-1',
        name: 'Claude Opus 4.1',
        tier: 'premium',
        description: 'Enhanced Opus with extended thinking',
        contextWindow: 200000,
        maxOutput: 32000,
        pricing: { input: 15, output: 75 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-opus-4',
        name: 'Claude Opus 4',
        tier: 'premium',
        description: 'High intelligence for complex tasks',
        contextWindow: 200000,
        maxOutput: 32000,
        pricing: { input: 15, output: 75 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        tier: 'flagship',
        description: 'Balanced performance',
        contextWindow: 200000,
        maxOutput: 64000,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Claude 3.7 Series
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
      // Claude 3.5 Series (Legacy)
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
        name: 'Claude 3.5 Sonnet (June)',
        tier: 'legacy',
        description: 'Original 3.5 release',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: { input: 3, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: false }
      },
      // Claude 3 Series (Legacy)
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
    defaultModel: 'gpt-5',
    models: [
      // GPT-5 Series (Flagship - 400K Context)
      {
        id: 'gpt-5',
        name: 'GPT-5',
        tier: 'flagship',
        description: 'Most powerful reasoning model',
        contextWindow: 400000,
        maxOutput: 128000,
        pricing: { input: 5, output: 15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        tier: 'fast',
        description: 'Fast GPT-5 variant',
        contextWindow: 400000,
        maxOutput: 128000,
        pricing: { input: 1.5, output: 6 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'gpt-5-nano',
        name: 'GPT-5 Nano',
        tier: 'fast',
        description: 'Smallest, fastest, most affordable GPT-5',
        contextWindow: 400000,
        maxOutput: 128000,
        pricing: { input: 0.5, output: 2 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Reasoning Models (o-Series)
      {
        id: 'o3-pro',
        name: 'o3-pro',
        tier: 'premium',
        description: 'Extended reasoning, most reliable',
        contextWindow: 200000,
        maxOutput: 100000,
        pricing: { input: 20, output: 80 },
        capabilities: { tools: true, streaming: false, json: true, extendedThinking: true }
      },
      {
        id: 'o3',
        name: 'o3',
        tier: 'premium',
        description: 'Advanced reasoning model',
        contextWindow: 200000,
        maxOutput: 100000,
        pricing: { input: 10, output: 40 },
        capabilities: { tools: true, streaming: false, json: true, extendedThinking: true }
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        tier: 'fast',
        description: 'Fast reasoning model',
        contextWindow: 200000,
        maxOutput: 100000,
        pricing: { input: 1.1, output: 4.4 },
        capabilities: { tools: true, streaming: false, json: true }
      },
      {
        id: 'o4-mini',
        name: 'o4-mini',
        tier: 'fast',
        description: 'Budget reasoning, great for math/coding',
        contextWindow: 200000,
        maxOutput: 100000,
        pricing: { input: 1.1, output: 4.4 },
        capabilities: { tools: true, streaming: false, json: true }
      },
      // GPT-4.1 Series (1M Context)
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        tier: 'flagship',
        description: 'Improved coding, 1M context',
        contextWindow: 1000000,
        maxOutput: 32768,
        pricing: { input: 2, output: 8 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        tier: 'fast',
        description: 'Fast 4.1 variant',
        contextWindow: 1000000,
        maxOutput: 32768,
        pricing: { input: 0.4, output: 1.6 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        tier: 'fast',
        description: 'Most affordable 4.1',
        contextWindow: 1000000,
        maxOutput: 32768,
        pricing: { input: 0.1, output: 0.4 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // GPT-4o Series (128K Context)
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
        id: 'gpt-4o-audio-preview',
        name: 'GPT-4o Audio',
        tier: 'experimental',
        description: 'Audio input/output support',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: { input: 2.5, output: 10 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Legacy Models
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
    defaultModel: 'gemini-2.5-flash',
    models: [
      // Gemini 3 Series (Preview - November 2025)
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        tier: 'flagship',
        description: 'Latest stable flagship with enhanced reasoning',
        contextWindow: 1000000,
        maxOutput: 65536,
        pricing: { input: 2, output: 12 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro Preview',
        tier: 'flagship',
        description: 'Most intelligent Gemini with dynamic thinking',
        contextWindow: 1000000,
        maxOutput: 65536,
        pricing: { input: 2, output: 12 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      // Gemini 2.5 Series (Stable - Latest Production)
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        tier: 'flagship',
        description: 'State-of-the-art reasoning model',
        contextWindow: 1000000,
        maxOutput: 65536,
        pricing: { input: 1.25, output: 10 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        tier: 'fast',
        description: 'Best price-performance with thinking',
        contextWindow: 1000000,
        maxOutput: 65536,
        pricing: { input: 0.15, output: 0.6 },
        capabilities: { vision: true, tools: true, streaming: true, json: true, extendedThinking: true }
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        tier: 'fast',
        description: 'Cost-efficient high throughput',
        contextWindow: 1000000,
        maxOutput: 65536,
        pricing: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Gemini 2.0 Series
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        tier: 'fast',
        description: 'Next-gen workhorse model',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.1, output: 0.4 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Exp)',
        tier: 'experimental',
        description: 'Free experimental model',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash-Lite',
        tier: 'fast',
        description: 'Cost-optimized low latency',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      // Gemini 1.5 Series (Deprecated)
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        tier: 'legacy',
        description: 'Previous generation (Deprecated)',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: { input: 1.25, output: 5 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        tier: 'legacy',
        description: 'Previous generation (Deprecated)',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
      {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        tier: 'legacy',
        description: 'Lightweight legacy (Deprecated)',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.0375, output: 0.15 },
        capabilities: { vision: true, tools: true, streaming: true, json: true }
      },
    ]
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    color: 'teal',
    defaultModel: 'sonar',
    models: [
      // Sonar Series (Search-Augmented)
      {
        id: 'sonar',
        name: 'Sonar',
        tier: 'fast',
        description: 'Quick facts, news, simple Q&A',
        contextWindow: 128000,
        maxOutput: 1000,
        pricing: { input: 1, output: 1 },
        capabilities: { streaming: true, json: true, search: true, citations: true }
      },
      {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        tier: 'flagship',
        description: 'Complex queries, competitive analysis',
        contextWindow: 200000,
        maxOutput: 4000,
        pricing: { input: 3, output: 15 },
        capabilities: { streaming: true, json: true, search: true, citations: true }
      },
      // Reasoning Series
      {
        id: 'sonar-reasoning',
        name: 'Sonar Reasoning',
        tier: 'fast',
        description: 'Logic puzzles, math problems',
        contextWindow: 128000,
        maxOutput: 4096,
        pricing: { input: 1, output: 5 },
        capabilities: { streaming: true, json: true, search: true, citations: true }
      },
      {
        id: 'sonar-reasoning-pro',
        name: 'Sonar Reasoning Pro',
        tier: 'flagship',
        description: 'Complex problem-solving, research',
        contextWindow: 128000,
        maxOutput: 8192,
        pricing: { input: 2, output: 8 },
        capabilities: { streaming: true, json: true, search: true, citations: true }
      },
      // Deep Research
      {
        id: 'sonar-deep-research',
        name: 'Sonar Deep Research',
        tier: 'premium',
        description: 'Academic research, market analysis',
        contextWindow: 128000,
        maxOutput: 4000,
        pricing: { input: 2, output: 8 },
        capabilities: { streaming: true, json: true, search: true, citations: true, deepResearch: true }
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
