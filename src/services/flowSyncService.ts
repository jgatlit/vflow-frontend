/**
 * Flow Sync Service - Synchronize flows between backend and IndexedDB
 * Enables cross-device global pin synchronization
 */

import { db, type Flow } from '../db/database';
import { useFlowStore } from '../store/flowStore';

export interface BackendFlow {
  id: string;
  name: string;
  description?: string;
  flow: any; // ReactFlowJsonObject (with nodes, edges, viewport)
  tags: string[];
  category?: string;
  visibility?: 'private' | 'team' | 'public';
  version: string;
  pinLevel: 'none' | 'global'; // Backend only tracks global pins
  pinnedAt?: string;
  pinnedBy?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  status?: 'draft' | 'active' | 'archived' | 'deprecated';
  isTemplate?: boolean;
  isFavorite?: boolean;
  executionCount?: number;
  lastExecutedAt?: string;
  avgExecutionTime?: number;
  successRate?: number;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface BackendFlowResponse {
  flows: BackendFlow[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Merge backend flows with local IndexedDB flows
 * Strategy:
 * - Backend wins for global pin status
 * - Local IndexedDB wins for user pins (device-specific)
 * - Newer updatedAt wins for flow content conflicts
 * - All backend flows are added/updated in IndexedDB
 */
function mergeFlows(backendFlows: BackendFlow[], localFlows: Flow[]): Flow[] {
  const localFlowMap = new Map<string, Flow>();
  localFlows.forEach(flow => localFlowMap.set(flow.id, flow));

  const mergedFlows: Flow[] = [];
  const processedIds = new Set<string>();

  // Process backend flows (these take priority for global pins)
  backendFlows.forEach(backendFlow => {
    const localFlow = localFlowMap.get(backendFlow.id);
    processedIds.add(backendFlow.id);

    if (localFlow) {
      // Merge: backend + local (use type assertion as we know the structure matches)
      const mergedFlow = {
        ...localFlow,
        ...backendFlow,
        // Preserve local-only fields (device-specific)
        createdOnDevice: localFlow.createdOnDevice,
        lastModifiedOnDevice: localFlow.lastModifiedOnDevice,
        // Backend wins for global pin status
        pinLevel: backendFlow.pinLevel === 'global' ? 'global' : (localFlow.pinLevel || 'none'),
        pinnedAt: backendFlow.pinLevel === 'global' ? backendFlow.pinnedAt : localFlow.pinnedAt,
        pinnedBy: backendFlow.pinLevel === 'global' ? backendFlow.pinnedBy : localFlow.pinnedBy,
        // Use newer content
        flow: new Date(backendFlow.updatedAt) > new Date(localFlow.updatedAt)
          ? backendFlow.flow
          : localFlow.flow,
        deleted: localFlow.deleted || false,
      } as Flow;

      mergedFlows.push(mergedFlow);
    } else {
      // New flow from backend - convert to local format
      const newFlow: Flow = {
        id: backendFlow.id,
        name: backendFlow.name,
        description: backendFlow.description,
        flow: backendFlow.flow,
        tags: backendFlow.tags || [],
        category: backendFlow.category,
        visibility: backendFlow.visibility || 'private',
        version: backendFlow.version || '1.0.0',
        pinLevel: backendFlow.pinLevel,
        pinnedAt: backendFlow.pinnedAt,
        pinnedBy: backendFlow.pinnedBy,
        createdAt: backendFlow.createdAt,
        updatedAt: backendFlow.updatedAt,
        lastAccessedAt: backendFlow.lastAccessedAt,
        status: backendFlow.status,
        isTemplate: backendFlow.isTemplate,
        isFavorite: backendFlow.isFavorite,
        executionCount: backendFlow.executionCount,
        lastExecutedAt: backendFlow.lastExecutedAt,
        avgExecutionTime: backendFlow.avgExecutionTime,
        successRate: backendFlow.successRate,
        author: backendFlow.author?.name,
        deleted: false,
      };

      mergedFlows.push(newFlow);
    }
  });

  // Add local-only flows (not in backend)
  localFlows.forEach(localFlow => {
    if (!processedIds.has(localFlow.id)) {
      mergedFlows.push(localFlow);
    }
  });

  return mergedFlows;
}

/**
 * Sync flows from backend to IndexedDB
 * Returns merged flow list
 */
export async function syncFlowsFromBackend(): Promise<Flow[]> {
  try {
    console.log('[flowSyncService] Starting backend sync...');

    // Get device ID for authentication
    const deviceId = localStorage.getItem('visual-flow-device-id') || '';

    // Fetch from backend
    const response = await fetch('/api/flows?limit=1000', {
      headers: {
        'x-user-id': deviceId,
      },
    });

    if (!response.ok) {
      console.error('[flowSyncService] Backend fetch failed:', response.status, response.statusText);
      throw new Error(`Backend sync failed: ${response.status}`);
    }

    const data: BackendFlowResponse = await response.json();
    const backendFlows = data.flows || [];

    console.log(`[flowSyncService] Fetched ${backendFlows.length} flows from backend`);

    // Get local IndexedDB flows
    const localFlows = await db.flows.toArray();
    console.log(`[flowSyncService] Found ${localFlows.length} flows in IndexedDB`);

    // Merge flows (backend wins for conflicts)
    const mergedFlows = mergeFlows(backendFlows, localFlows);
    console.log(`[flowSyncService] Merged to ${mergedFlows.length} total flows`);

    // Update IndexedDB with merged flows
    if (mergedFlows.length > 0) {
      await db.flows.bulkPut(mergedFlows);
      console.log('[flowSyncService] IndexedDB updated with merged flows');
    }

    // Update Zustand globalPinnedFlows Set
    const globalPinIds = mergedFlows
      .filter(f => f.pinLevel === 'global')
      .map(f => f.id);

    console.log(`[flowSyncService] Found ${globalPinIds.length} globally pinned flows`);

    useFlowStore.setState({
      globalPinnedFlows: new Set(globalPinIds),
    });

    console.log('[flowSyncService] ✓ Sync completed successfully');

    return mergedFlows;

  } catch (error) {
    console.error('[flowSyncService] Backend sync failed:', error);

    // Fallback: return IndexedDB flows only (offline mode)
    console.log('[flowSyncService] Falling back to IndexedDB-only mode');
    const localFlows = await db.flows.toArray();

    // Update globalPinnedFlows based on local data
    const globalPinIds = localFlows
      .filter(f => f.pinLevel === 'global')
      .map(f => f.id);

    useFlowStore.setState({
      globalPinnedFlows: new Set(globalPinIds),
    });

    return localFlows;
  }
}

/**
 * Sync a single flow to backend (used when creating/updating flows)
 */
export async function syncFlowToBackend(flow: Flow): Promise<void> {
  try {
    const deviceId = localStorage.getItem('visual-flow-device-id') || '';

    const response = await fetch('/api/flows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': deviceId,
      },
      body: JSON.stringify({
        id: flow.id,
        name: flow.name,
        description: flow.description || `Flow with ${flow.flow?.nodes?.length || 0} nodes and ${flow.flow?.edges?.length || 0} connections`,
        flow: flow.flow,
        tags: flow.tags || [],
        version: flow.version || '1.0.0',
        category: flow.category,
        visibility: flow.visibility,
        status: flow.status,
        isTemplate: flow.isTemplate,
        isFavorite: flow.isFavorite,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync flow to backend: ${response.status}`);
    }

    console.log('[flowSyncService] Flow synced to backend:', flow.id);
  } catch (error) {
    console.error('[flowSyncService] Failed to sync flow to backend:', error);
    throw error;
  }
}

/**
 * Start periodic background sync (every 5 minutes)
 * Returns cleanup function to stop sync
 */
export function startPeriodicSync(): () => void {
  console.log('[flowSyncService] Starting periodic sync (5 min interval)');

  const intervalId = setInterval(async () => {
    // Only sync if app is visible/active
    if (document.visibilityState === 'visible') {
      console.log('[flowSyncService] Periodic sync triggered');
      await syncFlowsFromBackend();
    } else {
      console.log('[flowSyncService] Skipping sync (app not visible)');
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Return cleanup function
  return () => {
    console.log('[flowSyncService] Stopping periodic sync');
    clearInterval(intervalId);
  };
}
