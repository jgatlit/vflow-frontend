import type { Node, Edge } from '@xyflow/react';

export interface ExecutionResult {
  nodeId: string;
  output: string;
  error?: string;
  executedAt: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    duration?: number;
  };
}

export interface ExecutionContext {
  variables: Record<string, string>;
  results: Map<string, ExecutionResult>;
}

/**
 * Perform topological sort on flow nodes to determine execution order
 */
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize graph
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build adjacency list and calculate in-degrees
  edges.forEach(edge => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Find all nodes with no incoming edges (starting nodes)
  const queue: string[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });

  const sorted: Node[] = [];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find(n => n.id === nodeId);

    if (node && !processed.has(nodeId)) {
      sorted.push(node);
      processed.add(nodeId);

      // Reduce in-degree for neighbors
      const neighbors = graph.get(nodeId) || [];
      neighbors.forEach(neighborId => {
        const currentDegree = inDegree.get(neighborId) || 0;
        const newDegree = currentDegree - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0 && !processed.has(neighborId)) {
          queue.push(neighborId);
        }
      });
    }
  }

  // Check for cycles - only if we have edges
  if (edges.length > 0 && sorted.length !== nodes.length) {
    throw new Error('Cycle detected in flow graph');
  }

  return sorted;
}

/**
 * Substitute variables in text with their values from context
 */
export function substituteVariables(
  text: string,
  context: ExecutionContext
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const trimmedVar = variable.trim();

    // Check if it's a direct variable
    if (context.variables[trimmedVar]) {
      return context.variables[trimmedVar];
    }

    // Check if it's a node output reference (e.g., node_id or node_id.output)
    const parts = trimmedVar.split('.');
    const nodeId = parts[0];
    const result = context.results.get(nodeId);

    if (result) {
      return result.output;
    }

    // Variable not found, return original
    return match;
  });
}

/**
 * Get incoming nodes for a specific node
 */
export function getIncomingNodes(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source);
}

/**
 * Check if all dependencies are resolved
 */
export function areDependenciesResolved(
  nodeId: string,
  edges: Edge[],
  context: ExecutionContext
): boolean {
  const incomingNodes = getIncomingNodes(nodeId, edges);
  return incomingNodes.every(incomingId => context.results.has(incomingId));
}

/**
 * Extract all variables from text
 */
export function extractVariablesFromText(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    variables.push(match[1].trim());
  }

  return variables;
}
