import Dexie, { type Table } from 'dexie';
import type { ReactFlowJsonObject } from '@xyflow/react';
import type { ExecutionResult } from '../utils/executionEngine';

// Device and environment information
export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet'; // Device category
  os: string; // Operating system (e.g., "Windows 10", "macOS 14.1", "Linux")
  browser: string; // Browser name and version
  screenResolution?: string; // e.g., "1920x1080"
  timezone?: string; // User's timezone
  language?: string; // Browser language
  timestamp: string; // When this info was captured (ISO 8601)
}

// Flow database schema with comprehensive metadata
export interface Flow {
  // Core Identity
  id: string; // UUID v4
  name: string; // Human-readable workflow name
  description?: string; // Detailed description of workflow purpose

  // Authorship & Collaboration
  author?: string; // Primary author/creator
  contributors?: string[]; // List of contributors
  organization?: string; // Organization/team name

  // Timestamps (ISO 8601)
  createdAt: string; // When first created
  updatedAt: string; // Last modification time
  lastAccessedAt?: string; // Last time opened/viewed
  publishedAt?: string; // When published/shared

  // Categorization & Discovery
  tags?: string[]; // Multi-value tags for categorization
  category?: string; // Primary category (e.g., "data-processing", "automation")
  visibility?: 'private' | 'team' | 'public'; // Access level

  // Versioning & History
  version: string; // Semantic versioning (1.0.0)
  versionHistory?: { version: string; timestamp: string; changes: string }[];
  parentFlowId?: string; // If forked/cloned from another flow

  // Device & Environment (auto-populated)
  createdOnDevice?: DeviceInfo; // Device where created
  lastModifiedOnDevice?: DeviceInfo; // Device of last modification
  userAgent?: string; // Browser/client info

  // Usage Statistics
  executionCount?: number; // Total executions
  lastExecutedAt?: string; // Last execution timestamp
  avgExecutionTime?: number; // Average execution duration (ms)
  successRate?: number; // Percentage of successful executions

  // Status & Lifecycle
  status?: 'draft' | 'active' | 'archived' | 'deprecated';
  isTemplate?: boolean; // Is this a reusable template?
  isFavorite?: boolean; // User favorited

  // Content
  flow: ReactFlowJsonObject; // React Flow's native format
  thumbnail?: string; // Base64 or URL to workflow visualization
  readme?: string; // Markdown documentation

  // Soft Delete
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // When deleted
  deletedBy?: string; // Who deleted it
}

// Execution history schema with comprehensive metadata
export interface Execution {
  // Core Identity
  id: string; // UUID v4
  name?: string; // Optional execution name/label
  description?: string; // Purpose or notes for this execution

  // Flow Reference
  flowId: string; // Reference to parent flow
  flowName: string; // Flow name at execution time (for reference)
  flowVersion: string; // Flow version at execution time

  // Status & Timing (ISO 8601)
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string; // When execution began
  completedAt?: string; // When execution finished
  duration?: number; // Total duration in milliseconds

  // Trigger Context
  trigger: 'manual' | 'scheduled' | 'webhook' | 'api' | 'test'; // How was this triggered
  triggeredBy?: string; // User or system that triggered
  triggerMetadata?: Record<string, any>; // Additional trigger context

  // Device & Environment (auto-populated)
  executedOnDevice?: DeviceInfo; // Device where executed
  userAgent?: string; // Browser/client info
  ipAddress?: string; // IP address (if available/relevant)

  // Input & Output
  input?: Record<string, any>; // Input variables provided
  output?: any; // Final workflow output
  results: ExecutionResult[]; // Per-node results with metadata

  // Performance Metrics
  nodeExecutionTimes?: Record<string, number>; // Time per node (ms)
  apiCallCount?: number; // Number of API calls made
  tokensUsed?: number; // Total tokens consumed (for LLM nodes)
  cacheHits?: number; // Number of cache hits
  cacheMisses?: number; // Number of cache misses

  // Error Tracking
  error?: string; // Error message if failed
  errorStack?: string; // Stack trace for debugging
  errorType?: string; // Error classification
  failedNodeId?: string; // Node that caused failure
  failedNodeName?: string; // Name of failed node
  retryCount?: number; // Number of retry attempts

  // Logging & Debugging
  logs?: string[]; // Execution logs
  warnings?: string[]; // Non-fatal warnings
  debugInfo?: Record<string, any>; // Additional debug data

  // Data Management
  compressed?: boolean; // Whether results are compressed
  dataSize?: number; // Size of execution data (bytes)

  // Tags & Categorization
  tags?: string[]; // Custom tags for this execution
  environment?: 'development' | 'staging' | 'production'; // Environment

  // Soft Delete
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // When deleted
  deletedBy?: string; // Who deleted it
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
    .filter(flow => !flow.deleted)
    .sortBy('updatedAt');
}

/**
 * Search flows by name or tags
 */
export async function searchFlows(query: string): Promise<Flow[]> {
  const lowerQuery = query.toLowerCase();

  return await db.flows
    .filter(flow =>
      (flow.deleted === false || flow.deleted === undefined) &&
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
  flowName: string,
  flowVersion: string,
  input?: Record<string, any>
): Promise<Execution> {
  const execution: Execution = {
    id: crypto.randomUUID(),
    flowId,
    flowName,
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
  try {
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
  } catch (error) {
    // If localStorage quota is exceeded, try to clear old data and retry
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data...');
      try {
        // Clear recent flows history (keep last flow ID)
        localStorage.removeItem(STORAGE_KEYS.RECENT_FLOWS);
        // Retry saving just the last opened flow
        localStorage.setItem(STORAGE_KEYS.LAST_FLOW_ID, flowId);
      } catch (retryError) {
        console.error('Failed to save last opened flow even after clearing:', retryError);
        // Don't throw - this is not critical functionality
      }
    } else {
      console.error('Failed to save last opened flow:', error);
    }
  }
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

/**
 * Get storage usage diagnostics
 * Helps identify storage quota issues
 */
export async function getStorageInfo(): Promise<{
  indexedDB: { flowCount: number; executionCount: number };
  localStorage: { used: number; items: number };
  quota?: { usage: number; quota: number };
}> {
  const flowCount = await db.flows.count();
  const executionCount = await db.executions.count();

  // Calculate localStorage usage
  let localStorageSize = 0;
  let localStorageItems = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      localStorageSize += localStorage[key].length + key.length;
      localStorageItems++;
    }
  }

  const info: any = {
    indexedDB: { flowCount, executionCount },
    localStorage: { used: localStorageSize, items: localStorageItems }
  };

  // Try to get storage quota if available
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      info.quota = {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    } catch (e) {
      console.warn('Could not estimate storage quota:', e);
    }
  }

  return info;
}

// ===== AUTOMATIC METADATA POPULATION =====

/**
 * Get current device and environment information
 * Auto-populates device metadata for flows and executions
 */
/**
 * Custom JSON replacer to handle circular references, BigInt, and other non-serializable types
 * Tracks seen objects and converts problematic types to safe values
 */
function getSerializationReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Handle functions
    if (typeof value === 'function') {
      return undefined;
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    // Handle undefined
    if (value === undefined) {
      return null;
    }

    return value;
  };
}

/**
 * Sanitize an object for IndexedDB storage
 * Removes circular references, BigInt, functions, and other non-serializable data
 */
export function sanitizeForStorage(obj: any): any {
  try {
    // Use custom replacer to handle all non-serializable types
    const jsonString = JSON.stringify(obj, getSerializationReplacer());
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to sanitize object for storage:', error);
    return null;
  }
}

export function getCurrentDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;

  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Detect OS
  let os = 'Unknown';
  if (userAgent.includes('Win')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Detect browser
  let browser = 'Unknown';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return {
    deviceType,
    os,
    browser,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create flow with auto-populated metadata
 * Automatically fills in device info, timestamps, and defaults
 */
export async function createFlowWithMetadata(
  name: string,
  flow: ReactFlowJsonObject,
  options?: {
    description?: string;
    author?: string;
    tags?: string[];
    category?: string;
    isTemplate?: boolean;
  }
): Promise<Flow> {
  const deviceInfo = getCurrentDeviceInfo();

  const newFlow: Flow = {
    // Core identity
    id: crypto.randomUUID(),
    name,
    description: options?.description,

    // Authorship
    author: options?.author,
    contributors: options?.author ? [options.author] : [],

    // Timestamps (auto-populated)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),

    // Categorization
    tags: options?.tags || [],
    category: options?.category,
    visibility: 'private', // Default to private

    // Versioning
    version: '1.0.0',
    versionHistory: [{
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      changes: 'Initial creation'
    }],

    // Device info (auto-populated)
    createdOnDevice: deviceInfo,
    lastModifiedOnDevice: deviceInfo,
    userAgent: navigator.userAgent,

    // Usage statistics (initialized)
    executionCount: 0,
    successRate: 0,

    // Status
    status: 'draft',
    isTemplate: options?.isTemplate || false,
    isFavorite: false,

    // Content
    flow,

    // Soft delete
    deleted: false
  };

  // Sanitize the entire flow object to remove circular references and non-serializable data
  const sanitizedFlow = sanitizeForStorage(newFlow);

  if (!sanitizedFlow) {
    throw new Error('Failed to sanitize flow object for storage');
  }

  await db.flows.add(sanitizedFlow);
  return sanitizedFlow;
}

/**
 * Update flow with auto-updated metadata
 * Automatically updates timestamps and device info
 */
export async function updateFlowWithMetadata(
  id: string,
  updates: Partial<Flow>,
  changeDescription?: string
): Promise<Flow> {
  const deviceInfo = getCurrentDeviceInfo();
  const existingFlow = await db.flows.get(id);

  if (!existingFlow) {
    throw new Error(`Flow ${id} not found`);
  }

  // Update version history if version changed
  let versionHistory = existingFlow.versionHistory || [];
  if (updates.version && updates.version !== existingFlow.version) {
    versionHistory = [
      ...versionHistory,
      {
        version: updates.version,
        timestamp: new Date().toISOString(),
        changes: changeDescription || 'Updated version'
      }
    ];
  }

  const updatedData = {
    ...updates,
    updatedAt: new Date().toISOString(),
    lastModifiedOnDevice: deviceInfo,
    versionHistory: updates.version ? versionHistory : existingFlow.versionHistory
  };

  // Sanitize the update data to remove circular references and non-serializable objects
  const sanitizedData = sanitizeForStorage(updatedData);

  if (!sanitizedData) {
    throw new Error('Failed to sanitize update data for storage');
  }

  await db.flows.update(id, sanitizedData);

  // Return the updated flow
  const updatedFlow = await db.flows.get(id);
  if (!updatedFlow) {
    throw new Error(`Failed to retrieve updated flow ${id}`);
  }

  return updatedFlow;
}

/**
 * Create execution with auto-populated metadata
 * Automatically fills in device info, flow context, and timestamps
 */
export async function createExecutionWithMetadata(
  flowId: string,
  input?: Record<string, any>,
  options?: {
    name?: string;
    description?: string;
    trigger?: Execution['trigger'];
    triggeredBy?: string;
    environment?: 'development' | 'staging' | 'production';
    tags?: string[];
  }
): Promise<Execution> {
  const flow = await db.flows.get(flowId);
  if (!flow) {
    throw new Error(`Flow ${flowId} not found`);
  }

  const deviceInfo = getCurrentDeviceInfo();

  const execution: Execution = {
    // Core identity
    id: crypto.randomUUID(),
    name: options?.name,
    description: options?.description,

    // Flow reference
    flowId,
    flowName: flow.name,
    flowVersion: flow.version,

    // Status & timing (auto-populated)
    status: 'running',
    startedAt: new Date().toISOString(),

    // Trigger context
    trigger: options?.trigger || 'manual',
    triggeredBy: options?.triggeredBy,

    // Device & environment (auto-populated)
    executedOnDevice: deviceInfo,
    userAgent: navigator.userAgent,

    // Input
    input,

    // Results (initialized empty)
    results: [],

    // Performance metrics (initialized)
    apiCallCount: 0,
    tokensUsed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retryCount: 0,

    // Tags
    tags: options?.tags,
    environment: options?.environment || 'development',

    // Soft delete
    deleted: false
  };

  await db.executions.add(execution);

  // Update flow's last executed timestamp
  await db.flows.update(flowId, {
    lastExecutedAt: execution.startedAt,
    executionCount: (flow.executionCount || 0) + 1
  });

  return execution;
}

/**
 * Complete execution with auto-calculated metrics
 * Automatically calculates duration, updates flow statistics
 */
export async function completeExecutionWithMetadata(
  id: string,
  results: ExecutionResult[],
  options?: {
    status?: 'completed' | 'failed' | 'cancelled';
    error?: string;
    errorStack?: string;
    errorType?: string;
    failedNodeId?: string;
    output?: any;
    logs?: string[];
    warnings?: string[];
  }
): Promise<void> {
  const execution = await db.executions.get(id);
  if (!execution) {
    throw new Error(`Execution ${id} not found`);
  }

  const completedAt = new Date().toISOString();
  const duration = new Date(completedAt).getTime() - new Date(execution.startedAt).getTime();

  // Calculate total tokens used from results
  const tokensUsed = results.reduce((sum, result) => {
    return sum + (result.metadata?.tokensUsed || 0);
  }, 0);

  // Calculate data size
  const dataSize = new Blob([JSON.stringify({ results, ...options })]).size;

  // Find failed node name if applicable
  let failedNodeName: string | undefined;
  if (options?.failedNodeId) {
    const flow = await db.flows.get(execution.flowId);
    const failedNode = flow?.flow.nodes.find(n => n.id === options.failedNodeId);
    failedNodeName = failedNode?.data?.title as string || failedNode?.type;
  }

  await db.executions.update(id, {
    status: options?.status || 'completed',
    completedAt,
    duration,
    results,
    output: options?.output,
    tokensUsed,
    dataSize,
    error: options?.error,
    errorStack: options?.errorStack,
    errorType: options?.errorType,
    failedNodeId: options?.failedNodeId,
    failedNodeName,
    logs: options?.logs,
    warnings: options?.warnings
  });

  // Update flow statistics
  const flow = await db.flows.get(execution.flowId);
  if (flow) {
    const flowExecutions = await getFlowExecutions(execution.flowId, 100);
    const completedExecutions = flowExecutions.filter(e => e.status === 'completed');
    const successRate = (completedExecutions.length / flowExecutions.length) * 100;
    const avgExecutionTime = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length;

    await db.flows.update(execution.flowId, {
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimals
      avgExecutionTime: Math.round(avgExecutionTime)
    });
  }
}

/**
 * Access flow (updates lastAccessedAt)
 */
export async function accessFlow(flowId: string): Promise<void> {
  await db.flows.update(flowId, {
    lastAccessedAt: new Date().toISOString()
  });

  const flow = await db.flows.get(flowId);
  if (flow) {
    saveLastOpenedFlow(flowId, flow.name);
  }
}
