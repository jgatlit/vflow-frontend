/**
 * Workflow Export Validation Schemas
 *
 * Zod schemas for runtime validation of workflow exports and imports.
 */

import { z } from 'zod';

/**
 * Viewport schema (React Flow)
 */
export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(10),
});

/**
 * Node schema (React Flow)
 * Relaxed to accept any node structure from React Flow
 */
export const NodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.any(),
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
});

/**
 * Edge schema (React Flow)
 */
export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  data: z.any().optional(),
});

/**
 * React Flow JSON object schema
 */
export const ReactFlowJsonObjectSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  viewport: ViewportSchema,
});

/**
 * Workflow metadata schema
 */
export const WorkflowMetadataSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  icon: z.string().optional(),
});

/**
 * Credential reference schema
 */
export const CredentialReferenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  usedInNodes: z.array(z.string()),
});

/**
 * Retry policy schema
 */
export const RetryPolicySchema = z.object({
  maxRetries: z.number().min(0).max(10),
  backoffMs: z.number().min(0),
  backoffMultiplier: z.number().min(1).optional(),
});

/**
 * Workflow settings schema
 */
export const WorkflowSettingsSchema = z.object({
  timeout: z.number().min(0).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  executionMode: z.enum(['sequential', 'parallel', 'mixed']).optional(),
  errorHandling: z.enum(['stop', 'continue', 'fallback']).optional(),
  maxConcurrency: z.number().min(1).optional(),
});

/**
 * Variable definition schema
 */
export const VariableDefinitionSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'json']),
  required: z.boolean(),
  default: z.any().optional(),
  description: z.string().optional(),
  example: z.any().optional(),
});

/**
 * Complete workflow export schema
 */
export const WorkflowExportSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version format'),
  schemaVersion: z.string(),
  meta: WorkflowMetadataSchema,
  flow: ReactFlowJsonObjectSchema,
  credentials: z.array(CredentialReferenceSchema),
  settings: WorkflowSettingsSchema,
  variables: z.record(z.string(), VariableDefinitionSchema).optional(),
});

/**
 * Validate workflow export
 */
export function validateWorkflowExport(data: unknown): {
  success: boolean;
  data?: z.infer<typeof WorkflowExportSchema>;
  errors?: Array<{ path: string; message: string }>;
} {
  try {
    const validated = WorkflowExportSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ path: '', message: 'Unknown validation error' }],
    };
  }
}

/**
 * Validate connection integrity
 */
export function validateConnections(
  nodes: z.infer<typeof NodeSchema>[],
  edges: z.infer<typeof EdgeSchema>[]
): {
  valid: boolean;
  errors: string[];
  orphanedEdges: string[];
  hasCycles: boolean;
} {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const errors: string[] = [];
  const orphanedEdges: string[] = [];

  // Check for orphaned edges
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      orphanedEdges.push(edge.id);
      errors.push(`Edge ${edge.id}: source node ${edge.source} not found`);
    }
    if (!nodeIds.has(edge.target)) {
      orphanedEdges.push(edge.id);
      errors.push(`Edge ${edge.id}: target node ${edge.target} not found`);
    }
  }

  // Check for cycles using DFS
  const hasCycles = detectCycles(nodes, edges);
  if (hasCycles) {
    errors.push('Workflow contains circular dependencies');
  }

  return {
    valid: errors.length === 0,
    errors,
    orphanedEdges,
    hasCycles,
  };
}

/**
 * Detect cycles in the workflow graph using DFS
 */
function detectCycles(
  nodes: z.infer<typeof NodeSchema>[],
  edges: z.infer<typeof EdgeSchema>[]
): boolean {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const node of nodes) {
    graph.set(node.id, []);
  }
  for (const edge of edges) {
    const neighbors = graph.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}
