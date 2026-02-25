import { getModel, PROVIDERS } from '../config/models';

/**
 * Estimates token count using a simple character-based heuristic.
 * Approximates ~4 characters per token (OpenAI/Anthropic average).
 * This is a rough estimate for pre-flight checks, not exact tokenization.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Checks if the given input text fits within a model's context window.
 * Returns fit status, estimated token count, limit, and alternative model suggestions.
 */
export function checkContextFit(
  provider: string,
  modelId: string,
  inputText: string
): {
  fits: boolean;
  estimatedTokens: number;
  limit: number;
  suggestions: string[];
} {
  const model = getModel(provider, modelId);
  if (!model || !model.contextWindow) {
    return { fits: true, estimatedTokens: 0, limit: 0, suggestions: [] };
  }

  const estimatedTokens = estimateTokenCount(inputText);
  const limit = model.contextWindow;
  const fits = estimatedTokens <= limit;

  // If it doesn't fit, suggest alternative models from the same provider with larger context windows
  const suggestions: string[] = [];
  if (!fits) {
    const providerConfig = PROVIDERS[provider];
    if (providerConfig) {
      const alternativeModels = providerConfig.models
        .filter(m => (m.contextWindow || 0) > limit)
        .sort((a, b) => (a.contextWindow || 0) - (b.contextWindow || 0))
        .slice(0, 3); // Top 3 alternatives

      suggestions.push(
        ...alternativeModels.map(m => `${m.name} (${m.contextWindow?.toLocaleString()} tokens)`)
      );
    }
  }

  return { fits, estimatedTokens, limit, suggestions };
}

/**
 * Validates all LLM nodes in a flow against their model's context window limits.
 * Returns validation result with details about any violations.
 */
export function validateFlowTokenLimits(
  nodes: any[],
  context: Record<string, string>
): {
  isValid: boolean;
  violations: Array<{
    nodeId: string;
    nodeType: string;
    estimatedTokens: number;
    limit: number;
    modelName: string;
    suggestions: string[];
  }>;
} {
  const violations: Array<{
    nodeId: string;
    nodeType: string;
    estimatedTokens: number;
    limit: number;
    modelName: string;
    suggestions: string[];
  }> = [];

  // Filter to LLM nodes only
  const llmNodeTypes = ['openai', 'anthropic', 'gemini', 'perplexity', 'toolAugmentedLLM', 'agent'];

  for (const node of nodes) {
    if (!llmNodeTypes.includes(node.type)) continue;

    const nodeData = node.data || {};
    const provider = nodeData.provider || node.type;
    const modelId = nodeData.model;
    const prompt = nodeData.prompt || '';

    // Resolve variables in prompt
    let resolvedPrompt = prompt;
    for (const [key, value] of Object.entries(context)) {
      resolvedPrompt = resolvedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    const result = checkContextFit(provider, modelId, resolvedPrompt);
    if (!result.fits) {
      const model = getModel(provider, modelId);
      violations.push({
        nodeId: node.id,
        nodeType: node.type,
        estimatedTokens: result.estimatedTokens,
        limit: result.limit,
        modelName: model?.name || modelId,
        suggestions: result.suggestions,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
