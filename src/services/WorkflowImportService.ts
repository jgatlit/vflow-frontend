/**
 * Workflow Import Service
 *
 * Handles importing workflows from .vflow JSON files.
 */

import type { Node, Edge, Viewport } from '@xyflow/react';
import type {
  WorkflowExport,
  ImportResult,
  CredentialReference,
} from '../types/workflow-export';
import { validateWorkflowExport, validateConnections } from '../utils/validation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SUPPORTED_VERSIONS = ['v1'];

/**
 * Parse and validate imported file
 */
export async function parseWorkflowFile(file: File): Promise<WorkflowExport> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  // Validate schema
  const validation = validateWorkflowExport(parsed);
  if (!validation.success) {
    const errors = validation.errors?.map((e) => `${e.path}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return validation.data as WorkflowExport;
}

/**
 * Check version compatibility
 */
function isVersionCompatible(schemaVersion: string): boolean {
  return SUPPORTED_VERSIONS.includes(schemaVersion);
}

/**
 * Migrate workflow to current version (if needed)
 */
function migrateWorkflow(workflow: WorkflowExport): WorkflowExport {
  // Currently only supporting v1, so no migration needed
  // Future migrations would go here
  return workflow;
}

/**
 * Validate workflow connections
 */
function validateWorkflowConnections(workflow: WorkflowExport): void {
  const validation = validateConnections(workflow.flow.nodes, workflow.flow.edges);

  if (!validation.valid) {
    // Remove orphaned edges instead of failing
    if (validation.orphanedEdges.length > 0) {
      workflow.flow.edges = workflow.flow.edges.filter(
        (edge) => !validation.orphanedEdges.includes(edge.id)
      );
    }

    // Warn about cycles but don't fail
    if (validation.hasCycles) {
      console.warn('Workflow contains circular dependencies');
    }
  }
}

/**
 * Remap credential IDs in nodes
 */
function remapCredentials(
  nodes: Node[],
  mappings: Record<string, string>
): Node[] {
  return nodes.map((node) => {
    if (node.data?.credentialId) {
      const newCredId = mappings[node.data.credentialId as string];
      if (newCredId) {
        return {
          ...node,
          data: {
            ...node.data,
            credentialId: newCredId,
          },
        };
      }
    }
    return node;
  });
}

/**
 * Import workflow from file
 */
export async function importWorkflow(
  file: File
): Promise<ImportResult> {
  try {
    // Parse and validate file
    const workflow = await parseWorkflowFile(file);

    // Check version compatibility
    if (!isVersionCompatible(workflow.schemaVersion)) {
      throw new Error(
        `Incompatible schema version: ${workflow.schemaVersion}. ` +
          `Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
      );
    }

    // Migrate if needed
    const migrated = migrateWorkflow(workflow);

    // Validate connections
    validateWorkflowConnections(migrated);

    return {
      success: true,
      workflow: migrated,
      credentialMappings: {},
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import workflow via backend API
 */
export async function importWorkflowViaAPI(
  workflow: WorkflowExport,
  credentialMappings: Record<string, string>
): Promise<ImportResult> {
  try {
    const response = await fetch(`${API_URL}/workflows/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow,
        credentialMappings,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Import failed');
    }

    const data = await response.json();
    return {
      success: true,
      workflow: data.workflow,
      credentialMappings: data.credentialMappings,
    };
  } catch (error) {
    console.error('Import via API failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API import failed',
    };
  }
}

/**
 * Apply imported workflow to canvas
 */
export function applyWorkflowToCanvas(
  workflow: WorkflowExport,
  credentialMappings: Record<string, string>,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setViewport: (viewport: Viewport) => void
): void {
  // Remap credentials
  const remappedNodes = remapCredentials(workflow.flow.nodes, credentialMappings);

  // Apply to canvas
  setNodes(remappedNodes);
  setEdges(workflow.flow.edges);
  setViewport(workflow.flow.viewport);
}

/**
 * Complete import workflow
 */
export async function performImport(
  file: File,
  credentialMappings: Record<string, string>,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setViewport: (viewport: Viewport) => void
): Promise<ImportResult> {
  // Import and validate
  const result = await importWorkflow(file);

  if (!result.success || !result.workflow) {
    return result;
  }

  // If there are credentials, try to process via API
  if (result.workflow.credentials.length > 0) {
    const apiResult = await importWorkflowViaAPI(result.workflow, credentialMappings);
    if (apiResult.success && apiResult.workflow) {
      applyWorkflowToCanvas(
        apiResult.workflow,
        apiResult.credentialMappings || {},
        setNodes,
        setEdges,
        setViewport
      );
      return apiResult;
    }
  }

  // Apply directly if no credentials or API failed
  applyWorkflowToCanvas(
    result.workflow,
    credentialMappings,
    setNodes,
    setEdges,
    setViewport
  );

  return result;
}

/**
 * Get credential references from workflow
 */
export function getCredentialReferences(
  workflow: WorkflowExport
): CredentialReference[] {
  return workflow.credentials;
}

/**
 * Check if workflow has credentials that need mapping
 */
export function needsCredentialMapping(workflow: WorkflowExport): boolean {
  return workflow.credentials.length > 0;
}
