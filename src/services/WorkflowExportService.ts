/**
 * Workflow Export Service
 *
 * Handles exporting workflows to .vflow JSON format.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowExport,
  WorkflowMetadata,
  CredentialReference,
  ExportOptions,
} from '../types/workflow-export';
import { validateWorkflowExport } from '../utils/validation';
import { scanForSecrets } from '../utils/secretScanning';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CURRENT_VERSION = '1.0.0';
const SCHEMA_VERSION = 'v1';

/**
 * Clean node data by removing runtime properties
 */
function cleanNodeData(node: Node): Node {
  const cleaned = { ...node };

  if (cleaned.data) {
    const data = { ...cleaned.data };

    // Remove runtime-only properties
    delete data.__runtime;
    delete data.__executionState;
    delete data.__cachedResults;
    delete data.__error;

    cleaned.data = data;
  }

  // Remove UI-only properties that shouldn't be exported
  const { selected, dragging, ...rest } = cleaned;

  return rest as Node;
}

/**
 * Extract credential references from nodes
 */
function extractCredentialReferences(nodes: Node[]): CredentialReference[] {
  const credentialMap = new Map<string, CredentialReference>();

  for (const node of nodes) {
    const credId = node.data?.credentialId;
    if (!credId) continue;

    if (!credentialMap.has(credId)) {
      // Create a reference with generic information
      credentialMap.set(credId, {
        id: credId,
        type: node.data?.credentialType || 'api-key',
        name: node.data?.credentialName || 'Credential',
        usedInNodes: [],
      });
    }

    credentialMap.get(credId)!.usedInNodes.push(node.id);
  }

  return Array.from(credentialMap.values());
}

/**
 * Export workflow to JSON format
 */
export async function exportWorkflow(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number },
  options: ExportOptions = {}
): Promise<WorkflowExport> {
  // Clean nodes
  const cleanedNodes = nodes.map(cleanNodeData);

  // Extract credential references
  const credentials = extractCredentialReferences(cleanedNodes);

  // Build metadata
  const now = new Date().toISOString();
  const meta: WorkflowMetadata = {
    name: options.name || 'Untitled Workflow',
    description: options.description,
    author: options.author,
    createdAt: now,
    updatedAt: now,
    tags: options.tags || [],
  };

  // Build export object
  const workflow: WorkflowExport = {
    version: CURRENT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    meta,
    flow: {
      nodes: cleanedNodes,
      edges,
      viewport,
    },
    credentials,
    settings: {
      timeout: 300000,
      executionMode: 'sequential',
      errorHandling: 'stop',
    },
  };

  // Validate
  const validation = validateWorkflowExport(workflow);
  if (!validation.success) {
    throw new Error(
      `Invalid workflow format: ${validation.errors?.map((e) => e.message).join(', ')}`
    );
  }

  // Scan for secrets
  const secrets = scanForSecrets(workflow);
  if (secrets.length > 0) {
    throw new Error(
      `Found ${secrets.length} potential secret(s) in export. ` +
        'Please remove sensitive data before exporting.'
    );
  }

  return workflow;
}

/**
 * Export workflow via backend API
 */
export async function exportWorkflowViaAPI(
  workflow: WorkflowExport
): Promise<WorkflowExport> {
  try {
    const response = await fetch(`${API_URL}/workflows/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Export failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Export via API failed:', error);
    // Fallback to local export if API fails
    return workflow;
  }
}

/**
 * Download workflow as .vflow file
 */
export function downloadWorkflowFile(
  workflow: WorkflowExport,
  filename?: string
): void {
  const json = JSON.stringify(workflow, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const sanitizedName = workflow.meta.name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();
  const defaultFilename = `${sanitizedName}-${Date.now()}.vflow`;

  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Complete export workflow (validate, export via API, download)
 */
export async function performExport(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number },
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create local export
    const workflow = await exportWorkflow(nodes, edges, viewport, options);

    // Try to enhance via backend API (optional)
    const enhancedWorkflow = await exportWorkflowViaAPI(workflow);

    // Download file
    downloadWorkflowFile(enhancedWorkflow);

    return { success: true };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
