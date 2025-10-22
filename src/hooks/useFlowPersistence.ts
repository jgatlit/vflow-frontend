import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import {
  db,
  createFlowWithMetadata,
  updateFlowWithMetadata,
  getLastOpenedFlowId,
  getMostRecentlyAccessedFlow,
  type Flow
} from '../db/database';
import { syncFlowToBackend, isBackendSyncEnabled } from '../services/backendApi';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface FlowPersistenceOptions {
  autosaveEnabled?: boolean;
  autosaveDelayMs?: number;
}

interface FlowPersistenceState {
  currentFlowId: string | null;
  currentFlowName: string;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
}

export function useFlowPersistence(options: FlowPersistenceOptions = {}) {
  const { autosaveEnabled = true, autosaveDelayMs = 2000 } = options;

  const { toObject } = useReactFlow();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const [state, setState] = useState<FlowPersistenceState>({
    currentFlowId: null,
    currentFlowName: 'Untitled Flow',
    autosaveStatus: 'idle',
    lastSavedAt: null,
    isDirty: false,
  });

  const autosaveTimerRef = useRef<number | null>(null);
  const lastSavedNodesRef = useRef<string>('');
  const lastSavedEdgesRef = useRef<string>('');
  const isImportingRef = useRef<boolean>(false);

  /**
   * Sanitize React Flow object to remove non-serializable data
   * Uses JSON serialization to strip all non-serializable properties (DOM events, functions, etc.)
   * This is the most reliable way to ensure IndexedDB compatibility
   */
  const sanitizeFlowObject = (flowObject: any) => {
    try {
      // Use JSON.parse(JSON.stringify()) to remove all non-serializable data
      // This automatically strips: functions, DOM nodes, Events, Symbols, undefined values
      const serialized = JSON.stringify(flowObject);
      const deserialized = JSON.parse(serialized);

      return {
        nodes: deserialized.nodes || [],
        edges: deserialized.edges || [],
        viewport: deserialized.viewport,
      };
    } catch (error) {
      console.error('Failed to sanitize flow object:', error);

      // Fallback: return minimal structure
      return {
        nodes: [],
        edges: [],
        viewport: flowObject.viewport || { x: 0, y: 0, zoom: 1 },
      };
    }
  };

  /**
   * Save current flow to database (with optional debounce bypass)
   */
  const saveFlow = useCallback(async (flowName?: string, immediate = false): Promise<Flow> => {
    console.log('[saveFlow] START', {
      flowName,
      immediate,
      currentFlowId: state.currentFlowId,
      currentFlowName: state.currentFlowName,
      nodesCount: nodes.length,
      edgesCount: edges.length
    });

    setState(prev => ({ ...prev, autosaveStatus: 'saving' }));

    try {
      const flowObject = toObject();
      const sanitizedFlow = sanitizeFlowObject(flowObject);
      const name = flowName || state.currentFlowName;

      let savedFlow: Flow;

      if (state.currentFlowId) {
        // Update existing flow
        console.log('[saveFlow] Updating existing flow', { id: state.currentFlowId, name });
        savedFlow = await updateFlowWithMetadata(state.currentFlowId, {
          name,
          flow: sanitizedFlow,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new flow
        console.log('[saveFlow] Creating new flow', { name });
        savedFlow = await createFlowWithMetadata(name, sanitizedFlow, {
          description: `Flow with ${nodes.length} nodes and ${edges.length} connections`,
          tags: ['auto-generated'],
        });

        // Store in localStorage for quick access
        localStorage.setItem('lastOpenedFlowId', savedFlow.id);
      }

      // Parallel backend sync (non-blocking)
      if (isBackendSyncEnabled()) {
        syncFlowToBackend(savedFlow).then(async (result: any) => {
          if (result.success) {
            console.log('✅ Backend sync successful');

            // If backend created a new flow with different ID, sync IndexedDB
            if (result.wasCreated && result.data?.id && result.data.id !== savedFlow.id) {
              console.log('[backendSync] Backend created new ID, syncing IndexedDB', {
                oldId: savedFlow.id,
                newId: result.data.id
              });

              try {
                // Update IndexedDB flow with backend ID
                const { db } = await import('../db/database');
                const flow = await db.flows.get(savedFlow.id);

                if (flow) {
                  // Delete old flow
                  await db.flows.delete(savedFlow.id);

                  // Create new flow with backend ID
                  await db.flows.add({
                    ...flow,
                    id: result.data.id
                  });

                  // Update local state with backend ID
                  setState(prev => ({
                    ...prev,
                    currentFlowId: result.data.id
                  }));

                  // Update localStorage reference
                  localStorage.setItem('lastOpenedFlowId', result.data.id);

                  console.log('[backendSync] IndexedDB synchronized with backend ID');
                }
              } catch (err) {
                console.error('[backendSync] Failed to sync IndexedDB:', err);
              }
            }
          } else {
            console.warn('⚠️ Backend sync failed:', result.error);
          }
        }).catch(error => {
          console.error('❌ Backend sync error:', error);
        });
      }

      // Update local state
      setState(prev => ({
        ...prev,
        currentFlowId: savedFlow.id,
        currentFlowName: savedFlow.name,
        autosaveStatus: 'saved',
        lastSavedAt: savedFlow.updatedAt,
        isDirty: false,
      }));

      // CRITICAL: Also update Zustand store's currentFlowId so other components can access it
      const { useFlowStore: FlowStore } = await import('../store/flowStore');
      FlowStore.setState({ currentFlowId: savedFlow.id });

      // Update refs to track saved state
      lastSavedNodesRef.current = JSON.stringify(nodes);
      lastSavedEdgesRef.current = JSON.stringify(edges);

      console.log('[saveFlow] SUCCESS', {
        id: savedFlow.id,
        name: savedFlow.name,
        updatedAt: savedFlow.updatedAt
      });

      // Reset to idle after 2 seconds (skip for immediate saves)
      if (!immediate) {
        setTimeout(() => {
          setState(prev => ({ ...prev, autosaveStatus: 'idle' }));
        }, 2000);
      } else {
        setState(prev => ({ ...prev, autosaveStatus: 'idle' }));
      }

      return savedFlow;
    } catch (error) {
      console.error('Failed to save flow:', error);
      setState(prev => ({ ...prev, autosaveStatus: 'error' }));

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, autosaveStatus: 'idle' }));
      }, 3000);

      throw error;
    }
  }, [state.currentFlowId, state.currentFlowName, toObject, nodes, edges]);

  /**
   * Force immediate save without debounce
   * Use for critical operations: flow switches, manual saves, browser close
   */
  const forceSave = useCallback(async (flowName?: string): Promise<Flow | null> => {
    // Only save if there's an active flow or changes to save
    if (!state.currentFlowId && nodes.length === 0) {
      return null;
    }

    try {
      return await saveFlow(flowName, true);
    } catch (error) {
      console.error('Force save failed:', error);
      return null;
    }
  }, [state.currentFlowId, nodes.length, saveFlow]);

  /**
   * Load flow from database by ID and apply to canvas
   * Automatically saves current flow before switching
   */
  const loadFlow = useCallback(async (flowId: string) => {
    try {
      // Force save current flow before switching (critical operation)
      if (state.currentFlowId && state.isDirty) {
        await forceSave();
      }

      const { accessFlow } = await import('../db/database');
      const flow = await db.flows.get(flowId);

      if (!flow) {
        throw new Error(`Flow not found: ${flowId}`);
      }

      // Import useFlowStore dynamically to avoid circular dependency
      const { useFlowStore } = await import('../store/flowStore');
      const { setNodes, setEdges } = useFlowStore.getState();

      // Apply flow to canvas
      if (flow.flow.nodes) {
        setNodes(flow.flow.nodes as any[]);
      }
      if (flow.flow.edges) {
        setEdges(flow.flow.edges as any[]);
      }

      // Update access tracking
      await accessFlow(flowId);

      // Update local state
      setState(prev => ({
        ...prev,
        currentFlowId: flow.id,
        currentFlowName: flow.name,
        lastSavedAt: flow.updatedAt,
        isDirty: false,
      }));

      // Update refs
      lastSavedNodesRef.current = JSON.stringify(flow.flow.nodes);
      lastSavedEdgesRef.current = JSON.stringify(flow.flow.edges);

      // Store in localStorage
      localStorage.setItem('lastOpenedFlowId', flow.id);

      return flow;
    } catch (error) {
      console.error('Failed to load flow:', error);
      throw error;
    }
  }, [state.currentFlowId, state.isDirty, forceSave]);

  /**
   * Create new flow (clear current state)
   */
  const newFlow = useCallback(async () => {
    console.log('[newFlow] Creating new flow');

    // Clear canvas
    const { useFlowStore } = await import('../store/flowStore');
    const { setNodes, setEdges } = useFlowStore.getState();
    setNodes([]);
    setEdges([]);

    setState({
      currentFlowId: null,
      currentFlowName: 'Untitled Flow',
      autosaveStatus: 'idle',
      lastSavedAt: null,
      isDirty: false,
    });

    lastSavedNodesRef.current = '';
    lastSavedEdgesRef.current = '';

    localStorage.removeItem('lastOpenedFlowId');

    console.log('[newFlow] New flow created - canvas cleared');
  }, []);

  /**
   * Save as new flow with a different name
   * Creates a brand new flow instead of updating the existing one
   * This allows users to create variants/copies by changing the name
   */
  const saveAsNewFlow = useCallback(async (newName: string) => {
    console.log('[saveAsNewFlow] Renaming/saving as new flow', {
      oldName: state.currentFlowName,
      newName,
      currentFlowId: state.currentFlowId
    });

    setState(prev => ({
      ...prev,
      currentFlowName: newName,
      isDirty: true,
    }));

    try {
      const flowObject = toObject();
      const sanitizedFlow = sanitizeFlowObject(flowObject);

      // Always create a NEW flow (ignore currentFlowId)
      const savedFlow = await createFlowWithMetadata(newName, sanitizedFlow, {
        description: `Flow with ${nodes.length} nodes and ${edges.length} connections`,
        tags: ['auto-generated'],
      });

      // Store in localStorage for quick access
      localStorage.setItem('lastOpenedFlowId', savedFlow.id);

      // Parallel backend sync (non-blocking)
      if (isBackendSyncEnabled()) {
        syncFlowToBackend(savedFlow).then(async (result: any) => {
          if (result.success) {
            console.log('✅ Backend sync successful');

            // If backend created a new flow with different ID, sync IndexedDB
            if (result.wasCreated && result.data?.id && result.data.id !== savedFlow.id) {
              console.log('[backendSync] Backend created new ID, syncing IndexedDB', {
                oldId: savedFlow.id,
                newId: result.data.id
              });

              try {
                // Update IndexedDB flow with backend ID
                const { db } = await import('../db/database');
                const flow = await db.flows.get(savedFlow.id);

                if (flow) {
                  // Delete old flow
                  await db.flows.delete(savedFlow.id);

                  // Create new flow with backend ID
                  await db.flows.add({
                    ...flow,
                    id: result.data.id
                  });

                  // Update local state with backend ID
                  setState(prev => ({
                    ...prev,
                    currentFlowId: result.data.id
                  }));

                  // Update localStorage reference
                  localStorage.setItem('lastOpenedFlowId', result.data.id);

                  console.log('[backendSync] IndexedDB synchronized with backend ID');
                }
              } catch (err) {
                console.error('[backendSync] Failed to sync IndexedDB:', err);
              }
            }
          } else {
            console.warn('⚠️ Backend sync failed:', result.error);
          }
        }).catch(error => {
          console.error('❌ Backend sync error:', error);
        });
      }

      // Update local state
      setState(prev => ({
        ...prev,
        currentFlowId: savedFlow.id,
        currentFlowName: savedFlow.name,
        autosaveStatus: 'saved',
        lastSavedAt: savedFlow.updatedAt,
        isDirty: false,
      }));

      // Update refs to track saved state
      lastSavedNodesRef.current = JSON.stringify(nodes);
      lastSavedEdgesRef.current = JSON.stringify(edges);

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, autosaveStatus: 'idle' }));
      }, 2000);

      return savedFlow;
    } catch (error) {
      console.error('Failed to save as new flow:', error);
      setState(prev => ({ ...prev, autosaveStatus: 'error' }));

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, autosaveStatus: 'idle' }));
      }, 3000);

      throw error;
    }
  }, [toObject, nodes, edges]);

  /**
   * Rename current flow and save (DEPRECATED - Use saveAsNewFlow instead)
   * Kept for backward compatibility
   */
  const renameFlow = saveAsNewFlow;

  /**
   * Import flow - Set metadata from imported workflow and trigger autosave
   * Uses a simplified approach: just use the imported name and let saveFlow handle creation
   *
   * Uses import flag to prevent race conditions with autosave effect
   */
  const importFlow = useCallback(async (name: string) => {
    console.log('[importFlow] START', { name, currentNodes: nodes.length, currentEdges: edges.length });

    // Set import flag to block autosave during import
    isImportingRef.current = true;

    try {
      // Use the name as-is (no deduplication during import)
      // The saveFlow operation will create a new flow entry with this name
      const finalName = name;

      console.log('[importFlow] Using name:', finalName);

      setState(prev => {
        console.log('[importFlow] setState', {
          prev: prev.currentFlowName,
          next: finalName,
          prevStatus: prev.autosaveStatus,
          prevFlowId: prev.currentFlowId
        });
        return {
          ...prev,
          currentFlowId: null, // Clear ID so next save creates new flow
          currentFlowName: finalName,
          isDirty: false, // Starts clean, autosave will trigger from nodes changing
          lastSavedAt: null,
          autosaveStatus: 'idle', // Reset status from any previous saves
        };
      });

      // Update refs IMMEDIATELY to sync with imported state
      // This prevents autosave from detecting changes during the import process
      lastSavedNodesRef.current = JSON.stringify(nodes);
      lastSavedEdgesRef.current = JSON.stringify(edges);

      console.log('[importFlow] Refs updated, scheduling save');

      // Schedule explicit save after debounce period
      // This ensures the imported flow gets saved as a new flow
      setTimeout(async () => {
        try {
          console.log('[importFlow] Executing scheduled save');
          await saveFlow(finalName);
          console.log('[importFlow] Save completed successfully');
        } catch (err) {
          console.error('[importFlow] Scheduled save failed:', err);
        }
      }, 2500); // Slightly longer than autosave debounce to avoid conflicts

      console.log('[importFlow] END');
    } catch (error) {
      console.error('[importFlow] ERROR:', error);
      // Still clear the flag even on error
      setTimeout(() => {
        isImportingRef.current = false;
        console.log('[importFlow] Import flag cleared (after error)');
      }, 100);
      throw error; // Re-throw to propagate to caller
    } finally {
      // Clear import flag after short delay to ensure state updates have propagated
      setTimeout(() => {
        isImportingRef.current = false;
        console.log('[importFlow] Import flag cleared');
      }, 100);
    }
  }, [nodes, edges, saveFlow]);

  /**
   * Autosave logic - debounced save on changes
   * CRITICAL: Uses refs to avoid setState loops
   * Respects import flag to prevent race conditions during import
   */
  useEffect(() => {
    // Skip autosave during import to prevent race conditions
    if (isImportingRef.current) {
      console.log('[autosave] Skipped - import in progress');
      return;
    }

    if (!autosaveEnabled) return;

    // Check if flow has changed since last save
    const currentNodesStr = JSON.stringify(nodes);
    const currentEdgesStr = JSON.stringify(edges);

    const hasChanged =
      currentNodesStr !== lastSavedNodesRef.current ||
      currentEdgesStr !== lastSavedEdgesRef.current;

    console.log('[autosave] Trigger check', {
      hasChanged,
      currentFlowId: state.currentFlowId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      isImporting: isImportingRef.current
    });

    if (!hasChanged) return;

    // DON'T call setState here - it triggers re-renders and callback recreations
    // The saveFlow() will handle state updates when it actually saves

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer for autosave
    autosaveTimerRef.current = setTimeout(() => {
      // Only autosave if we have a current flow ID (i.e., flow has been saved at least once)
      if (state.currentFlowId) {
        console.log('[autosave] Executing save');
        saveFlow().catch(err => {
          console.error('[autosave] Failed:', err);
        });
      } else {
        console.log('[autosave] Skipped - no currentFlowId (new/imported flow)');
      }
    }, autosaveDelayMs);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, autosaveEnabled, autosaveDelayMs, state.currentFlowId]);

  /**
   * Restore last opened flow on mount ONLY
   * CRITICAL: Empty dependency array prevents re-running on state changes
   */
  useEffect(() => {
    const restoreLastFlow = async () => {
      // Try localStorage first (fastest)
      let lastFlowId = await getLastOpenedFlowId();

      // Fallback to IndexedDB query for most recently accessed flow
      if (!lastFlowId) {
        const recentFlow = await getMostRecentlyAccessedFlow();
        if (recentFlow) {
          lastFlowId = recentFlow.id;
          console.log('Restored most recently accessed flow from IndexedDB:', recentFlow.name);
        }
      }

      if (lastFlowId) {
        // Import loadFlow locally to avoid dependency
        const { accessFlow } = await import('../db/database');
        const flow = await db.flows.get(lastFlowId);

        if (!flow) {
          console.error(`Flow not found: ${lastFlowId}`);
          localStorage.removeItem('lastOpenedFlowId');
          return;
        }

        // Import useFlowStore dynamically
        const { useFlowStore } = await import('../store/flowStore');
        const { setNodes, setEdges } = useFlowStore.getState();

        // Apply flow to canvas
        if (flow.flow.nodes) {
          setNodes(flow.flow.nodes as any[]);
        }
        if (flow.flow.edges) {
          setEdges(flow.flow.edges as any[]);
        }

        // Update access tracking
        await accessFlow(lastFlowId);

        // Update local state
        setState({
          currentFlowId: flow.id,
          currentFlowName: flow.name,
          autosaveStatus: 'idle',
          lastSavedAt: flow.updatedAt,
          isDirty: false,
        });

        // Update refs
        lastSavedNodesRef.current = JSON.stringify(flow.flow.nodes);
        lastSavedEdgesRef.current = JSON.stringify(flow.flow.edges);
      }
    };

    restoreLastFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // EMPTY ARRAY - only run on mount

  /**
   * Option 3: Browser beforeunload Hook
   * Force save before browser close/refresh to catch changes during debounce window
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only trigger if there are unsaved changes
      if (state.isDirty && state.currentFlowId) {
        // Force synchronous save (best effort)
        forceSave().catch(err => {
          console.error('Failed to save before unload:', err);
        });

        // Show browser confirmation if there are unsaved changes
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.isDirty, state.currentFlowId, forceSave]);

  return {
    // State
    ...state,

    // Actions
    saveFlow,
    forceSave,
    loadFlow,
    newFlow,
    renameFlow,
    importFlow, // New: allows ImportButton to update flow metadata
  };
}
