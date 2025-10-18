import Dexie, { Table } from 'dexie';
import type { ReactFlowJsonObject } from '@xyflow/react';
import type { ExecutionResult } from '../utils/executionEngine';

// Flow database schema
export interface Flow {
  id: string; // UUID v4
  name: string; // Human-readable workflow name
  description?: string;
  author?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  tags?: string[]; // Multi-value for categorization
  version: string; // Semantic versioning (1.0.0)
  flow: ReactFlowJsonObject; // React Flow's native format
  deleted?: boolean; // Soft delete
  deletedAt?: string;
}

// Execution history schema
export interface Execution {
  id: string; // UUID v4
  flowId: string; // Reference to parent flow
  flowVersion: string; // Flow version at execution time
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  duration?: number; // Milliseconds
  trigger: 'manual' | 'scheduled' | 'webhook' | 'api';
  input?: Record<string, any>; // Input variables
  results: ExecutionResult[]; // Per-node results
  error?: string; // Error message if failed
  errorStack?: string; // Stack trace for debugging
  failedNodeId?: string; // Node that caused failure
  logs?: string[]; // Execution logs
  compressed?: boolean; // Whether results are compressed
  deleted?: boolean; // Soft delete
  deletedAt?: string;
}

// Metadata for recent flows tracking
export interface RecentFlow {
  id: string;
  name: string;
  lastOpened: string; // ISO 8601
}

// Database class
class FlowDatabase extends Dexie {
  flows!: Table<Flow, string>;
  executions!: Table<Execution, string>;

  constructor() {
    super('VisualFlowDB');

    // Version 1: Initial schema
    this.version(1).stores({
      // Flows table with indexes
      flows: 'id, name, createdAt, updatedAt, *tags, author, deleted',

      // Executions table with indexes
      executions: 'id, flowId, startedAt, completedAt, status, deleted'
    });
  }
}

// Export singleton instance
export const db = new FlowDatabase();

// Helper functions for common operations

/**
 * Create a new flow with default metadata
 */
export async function createFlow(
  name: string,
  flow: ReactFlowJsonObject,
  options?: { description?: string; author?: string; tags?: string[] }
): Promise<Flow> {
  const newFlow: Flow = {
    id: crypto.randomUUID(),
    name,
    description: options?.description,
    author: options?.author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: options?.tags || [],
    version: '1.0.0',
    flow,
    deleted: false
  };

  await db.flows.add(newFlow);
  return newFlow;
}

/**
 * Update an existing flow
 */
export async function updateFlow(
  id: string,
  updates: Partial<Flow>
): Promise<void> {
  await db.flows.update(id, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Soft delete a flow
 */
export async function deleteFlow(id: string): Promise<void> {
  await db.flows.update(id, {
    deleted: true,
    deletedAt: new Date().toISOString()
  });
}

/**
 * Get all non-deleted flows
 */
export async function getAllFlows(): Promise<Flow[]> {
  return await db.flows
    .where('deleted')
    .equals(0) // Dexie treats undefined/false as 0
    .or('deleted')
    .equals(undefined)
    .sortBy('updatedAt');
}

/**
 * Search flows by name or tags
 */
export async function searchFlows(query: string): Promise<Flow[]> {
  const lowerQuery = query.toLowerCase();

  return await db.flows
    .filter(flow =>
      !flow.deleted &&
      (flow.name.toLowerCase().includes(lowerQuery) ||
       flow.description?.toLowerCase().includes(lowerQuery) ||
       flow.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)))
    )
    .toArray();
}

/**
 * Create execution record
 */
export async function createExecution(
  flowId: string,
  flowVersion: string,
  input?: Record<string, any>
): Promise<Execution> {
  const execution: Execution = {
    id: crypto.randomUUID(),
    flowId,
    flowVersion,
    status: 'running',
    startedAt: new Date().toISOString(),
    trigger: 'manual', // Default to manual
    input,
    results: [],
    deleted: false
  };

  await db.executions.add(execution);
  return execution;
}

/**
 * Update execution with results
 */
export async function completeExecution(
  id: string,
  results: ExecutionResult[],
  status: 'completed' | 'failed' | 'cancelled' = 'completed',
  error?: string
): Promise<void> {
  const completedAt = new Date().toISOString();
  const execution = await db.executions.get(id);

  if (!execution) return;

  const duration = new Date(completedAt).getTime() - new Date(execution.startedAt).getTime();

  await db.executions.update(id, {
    status,
    completedAt,
    duration,
    results,
    error
  });
}

/**
 * Get executions for a flow
 */
export async function getFlowExecutions(
  flowId: string,
  limit: number = 100
): Promise<Execution[]> {
  return await db.executions
    .where('flowId')
    .equals(flowId)
    .and(execution => !execution.deleted)
    .reverse() // Most recent first
    .limit(limit)
    .toArray();
}

/**
 * Cleanup old executions (retention policy)
 */
export async function cleanupOldExecutions(
  maxExecutionsPerFlow: number = 100,
  successfulDays: number = 30,
  failedDays: number = 90
): Promise<number> {
  const now = new Date();
  const successCutoff = new Date(now.getTime() - successfulDays * 24 * 60 * 60 * 1000);
  const failureCutoff = new Date(now.getTime() - failedDays * 24 * 60 * 60 * 1000);

  let deletedCount = 0;

  // Get all flows
  const flows = await getAllFlows();

  for (const flow of flows) {
    // Get executions for this flow
    const executions = await db.executions
      .where('flowId')
      .equals(flow.id)
      .and(e => !e.deleted)
      .sortBy('startedAt');

    // Keep only recent executions based on status
    const toDelete = executions.filter((execution, index) => {
      const startedAt = new Date(execution.startedAt);

      // Keep if within limit
      if (index < maxExecutionsPerFlow) {
        // But delete if too old based on status
        if (execution.status === 'completed' && startedAt < successCutoff) {
          return true;
        }
        if (execution.status === 'failed' && startedAt < failureCutoff) {
          return true;
        }
        return false;
      }

      // Beyond limit, delete
      return true;
    });

    // Soft delete old executions
    for (const execution of toDelete) {
      await db.executions.update(execution.id, {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      deletedCount++;
    }
  }

  return deletedCount;
}

// LocalStorage helpers for recent flows
const STORAGE_KEYS = {
  LAST_FLOW_ID: 'vf:lastOpenedFlowId',
  RECENT_FLOWS: 'vf:recentFlows',
  LAST_EXPORT_NAME: 'vf:lastExportName'
};

export function saveLastOpenedFlow(flowId: string, flowName: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_FLOW_ID, flowId);

  // Update recent flows list (keep last 10)
  const recent: RecentFlow[] = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.RECENT_FLOWS) || '[]'
  );

  const updated = [
    { id: flowId, name: flowName, lastOpened: new Date().toISOString() },
    ...recent.filter(r => r.id !== flowId)
  ].slice(0, 10);

  localStorage.setItem(STORAGE_KEYS.RECENT_FLOWS, JSON.stringify(updated));
}

export function getLastOpenedFlowId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_FLOW_ID);
}

export function getRecentFlows(): RecentFlow[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_FLOWS) || '[]');
}

export function clearRecentFlows(): void {
  localStorage.removeItem(STORAGE_KEYS.RECENT_FLOWS);
  localStorage.removeItem(STORAGE_KEYS.LAST_FLOW_ID);
}
