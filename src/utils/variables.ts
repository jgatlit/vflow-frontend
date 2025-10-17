/**
 * Extract variables from text in the format {{variableName}}
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = text.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}

/**
 * Highlight variables in text by wrapping them in spans
 */
export function highlightVariables(text: string): string {
  return text.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="variable-highlight">{{$1}}</span>'
  );
}

/**
 * Check if text contains any variables
 */
export function hasVariables(text: string): boolean {
  return /\{\{[^}]+\}\}/g.test(text);
}

/**
 * Get all variables from all nodes in the flow
 */
export function getAllFlowVariables(nodes: any[]): string[] {
  const allVariables = new Set<string>();

  nodes.forEach(node => {
    if (node.data?.userPrompt) {
      extractVariables(node.data.userPrompt).forEach(v => allVariables.add(v));
    }
    if (node.data?.systemPrompt) {
      extractVariables(node.data.systemPrompt).forEach(v => allVariables.add(v));
    }
  });

  return Array.from(allVariables);
}
