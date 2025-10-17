/**
 * Workflow Export Types
 *
 * Type definitions for Visual Flow workflow import/export functionality.
 * These mirror the backend types to ensure compatibility.
 */

import type { Node, Edge, Viewport } from '@xyflow/react';

/**
 * React Flow JSON object structure
 */
export interface ReactFlowJsonObject {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  id?: string;
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  version?: string;
  icon?: string;
}

/**
 * Credential reference (NO actual values)
 */
export interface CredentialReference {
  id: string;
  type: string;
  name: string;
  usedInNodes: string[];
}

/**
 * Workflow execution settings
 */
export interface WorkflowSettings {
  timeout?: number;
  retryPolicy?: RetryPolicy;
  executionMode?: 'sequential' | 'parallel' | 'mixed';
  errorHandling?: 'stop' | 'continue' | 'fallback';
  maxConcurrency?: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier?: number;
}

/**
 * Variable definition
 */
export interface VariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'json';
  required: boolean;
  default?: any;
  description?: string;
  example?: any;
}

/**
 * Complete workflow export structure
 */
export interface WorkflowExport {
  version: string;
  schemaVersion: string;
  meta: WorkflowMetadata;
  flow: ReactFlowJsonObject;
  credentials: CredentialReference[];
  settings: WorkflowSettings;
  variables?: Record<string, VariableDefinition>;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  workflow?: WorkflowExport;
  credentialMappings?: Record<string, string>;
  error?: string;
}

/**
 * Credential mapping for import
 */
export interface CredentialMapping {
  originalId: string;
  newId?: string;
  action: 'map' | 'create' | 'skip';
  existingCredential?: {
    id: string;
    name: string;
    type: string;
  };
  newCredential?: {
    name: string;
    type: string;
    data: Record<string, any>;
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  name?: string;
  description?: string;
  author?: string;
  tags?: string[];
  compress?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}
