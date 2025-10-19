/**
 * Model Capability Mapping
 *
 * Defines which models support structured output (JSON/CSV) based on research
 * from official provider documentation (January 2025).
 *
 * Structured Output Support:
 * - OpenAI: GPT-4o and newer models via response_format with strict: true
 * - Anthropic: All Claude models via tool use pattern
 * - Google Gemini: All Gemini models via response_schema parameter
 */

export interface ModelCapability {
  supportsStructuredOutput: boolean;
  supportsJsonMode: boolean;
  structuredOutputMethod: 'response_format' | 'tool_use' | 'response_schema' | null;
  maxOutputTokens?: number;
  notes?: string;
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  // OpenAI Models - GPT-5 Series (Latest)
  'gpt-5': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 128000,
    notes: 'GPT-5 flagship model with 400K context, 128K output'
  },
  'gpt-5-mini': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 128000,
    notes: 'Faster, budget-friendly GPT-5 variant'
  },
  'gpt-5-nano': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 128000,
    notes: 'Smallest, fastest, most affordable GPT-5'
  },
  // OpenAI Models - GPT-4.1 Series
  'gpt-4.1': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: 'GPT-4.1 with 1M context, improved coding'
  },
  'gpt-4.1-mini': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: 'GPT-4.1 mini variant'
  },
  'gpt-4.1-nano': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: 'GPT-4.1 nano variant'
  },
  // OpenAI Models - GPT-4o Series
  'gpt-4o': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: '100% schema compliance with strict mode'
  },
  'gpt-4o-mini': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: '100% schema compliance with strict mode'
  },
  'gpt-4o-audio': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: 'Supports audio input/output'
  },
  // OpenAI Models - Reasoning Series
  'o3': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 100000,
    notes: 'Reasoning model with structured output'
  },
  'o3-mini': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 100000,
    notes: 'Reasoning model with structured output'
  },
  'o4-mini': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 16384,
    notes: 'Latest mini model with structured output'
  },
  // OpenAI Models - Legacy
  'gpt-4-turbo': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_format',
    maxOutputTokens: 4096,
    notes: 'Supports JSON mode'
  },
  'gpt-3.5-turbo': {
    supportsStructuredOutput: false,
    supportsJsonMode: true,
    structuredOutputMethod: null,
    maxOutputTokens: 4096,
    notes: 'JSON mode only, no strict schema enforcement'
  },

  // Anthropic Models - Claude 4.5 Series (Latest)
  'claude-sonnet-4-5-20250929': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Best for complex agents and coding'
  },
  'claude-haiku-4-5-20251001': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 65536,
    notes: 'Fastest Haiku with near-frontier performance'
  },
  // Anthropic Models - Claude 4 Series
  'claude-opus-4-1-20250710': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude Opus 4.1 with extended thinking'
  },
  'claude-opus-4-20250514': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude Opus 4 baseline'
  },
  'claude-sonnet-4-20250514': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude Sonnet 4 baseline'
  },
  // Anthropic Models - Claude 3.7 Series
  'claude-sonnet-3-7-20250219': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude 3.7 Sonnet'
  },
  // Anthropic Models - Claude 3.5 Series
  'claude-sonnet-3-5-20241022': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude 3.5 Sonnet (October 2024)'
  },
  'claude-sonnet-3-5-20240620': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Claude 3.5 Sonnet (Legacy - June 2024)'
  },
  // Anthropic Models - Claude 3 Series (Legacy)
  'claude-3-opus-20240229': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 4096,
    notes: 'Claude 3 Opus (Legacy)'
  },
  'claude-3-haiku-20240307': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 4096,
    notes: 'Claude 3 Haiku (Legacy)'
  },

  // Google Gemini Models - 2.5 Series (Latest)
  'gemini-2.5-pro': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 65536,
    notes: 'State-of-the-art thinking model, 1M context'
  },
  'gemini-2.5-flash': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 65536,
    notes: 'Best price-performance with thinking, 1M context'
  },
  'gemini-2.5-flash-lite': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 65536,
    notes: 'Cost-efficient high throughput, 1M context'
  },
  // Google Gemini Models - 2.0 Series
  'gemini-2.0-flash': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Next-gen features, 1M context'
  },
  'gemini-2.0-flash-exp': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Experimental model with response_schema'
  },
  'gemini-2.0-flash-lite': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Cost-optimized, low latency'
  },
  // Google Gemini Models - 1.5 Series (Deprecated Sept 2025)
  'gemini-1.5-pro': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Native response_schema support (Deprecated)'
  },
  'gemini-1.5-flash': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Native response_schema support (Deprecated)'
  },
  'gemini-1.5-flash-8b': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Lightweight model with response_schema (Deprecated)'
  },
};

/**
 * Check if a model supports structured output
 */
export function supportsStructuredOutput(model: string): boolean {
  return MODEL_CAPABILITIES[model]?.supportsStructuredOutput ?? false;
}

/**
 * Get the structured output method for a model
 */
export function getStructuredOutputMethod(model: string): 'response_format' | 'tool_use' | 'response_schema' | null {
  return MODEL_CAPABILITIES[model]?.structuredOutputMethod ?? null;
}

/**
 * Get all models that support structured output
 */
export function getModelsWithStructuredOutput(): string[] {
  return Object.entries(MODEL_CAPABILITIES)
    .filter(([_, capability]) => capability.supportsStructuredOutput)
    .map(([model]) => model);
}

/**
 * Output format options
 */
export type OutputFormat = 'text' | 'json' | 'csv';

/**
 * Structured output field definition
 */
export interface StructuredOutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
}
