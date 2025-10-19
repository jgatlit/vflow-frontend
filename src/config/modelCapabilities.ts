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
  // OpenAI Models
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

  // Anthropic Models
  'claude-sonnet-4-5-20250929': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Tool use pattern for structured output'
  },
  'claude-4-5-haiku-20250514': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 65536,
    notes: 'Cost-effective with 64K output tokens'
  },
  'claude-sonnet-3-5-20241022': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Tool use pattern for structured output'
  },
  'claude-opus-4-1-20250620': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Tool use pattern for structured output'
  },
  'claude-opus-4-20250514': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'tool_use',
    maxOutputTokens: 8192,
    notes: 'Tool use pattern for structured output'
  },

  // Google Gemini Models
  'gemini-2.0-flash-exp': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Experimental model with response_schema'
  },
  'gemini-1.5-pro': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Native response_schema support'
  },
  'gemini-1.5-flash': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Native response_schema support'
  },
  'gemini-1.5-flash-8b': {
    supportsStructuredOutput: true,
    supportsJsonMode: true,
    structuredOutputMethod: 'response_schema',
    maxOutputTokens: 8192,
    notes: 'Lightweight model with response_schema'
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
