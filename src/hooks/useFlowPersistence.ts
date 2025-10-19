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
    setState(prev => ({ ...prev, autosaveStatus: 'saving' }));

    try {
      const flowObject = toObject();
      const sanitizedFlow = sanitizeFlowObject(flowObject);
      const name = flowName || state.currentFlowName;

      let savedFlow: Flow;

      if (state.currentFlowId) {
        // Update existing flow
        savedFlow = await updateFlowWithMetadata(state.currentFlowId, {
          name,
          flow: sanitizedFlow,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new flow
        savedFlow = await createFlowWithMetadata(name, sanitizedFlow, {
          description: `Flow with ${nodes.length} nodes and ${edges.length} connections`,
          tags: ['auto-generated'],
        });

        // Store in localStorage for quick access
        localStorage.setItem('lastOpenedFlowId', savedFlow.id);
      }

      // Parallel backend sync (non-blocking)
      if (isBackendSyncEnabled()) {
        syncFlowToBackend(savedFlow).then(result => {
          if (result.success) {
            console.log('✅ Backend sync successful');
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
  }, []);

  /**
   * Save as new flow with a different name
   * Creates a brand new flow instead of updating the existing one
   * This allows users to create variants/copies by changing the name
   */
  const saveAsNewFlow = useCallback(async (newName: string) => {
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
        syncFlowToBackend(savedFlow).then(result => {
          if (result.success) {
            console.log('✅ Backend sync successful');
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
   * Autosave logic - debounced save on changes
   */
  useEffect(() => {
    if (!autosaveEnabled) return;

    // Check if flow has changed since last save
    const currentNodesStr = JSON.stringify(nodes);
    const currentEdgesStr = JSON.stringify(edges);

    const hasChanged =
      currentNodesStr !== lastSavedNodesRef.current ||
      currentEdgesStr !== lastSavedEdgesRef.current;

    if (!hasChanged) return;

    // Mark as dirty
    setState(prev => ({ ...prev, isDirty: true }));

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer for autosave
    autosaveTimerRef.current = setTimeout(() => {
      // Only autosave if we have a current flow ID (i.e., flow has been saved at least once)
      if (state.currentFlowId) {
        saveFlow().catch(err => {
          console.error('Autosave failed:', err);
        });
      }
    }, autosaveDelayMs);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [nodes, edges, autosaveEnabled, autosaveDelayMs, state.currentFlowId, saveFlow]);

  /**
   * Restore last opened flow on mount
   * Option 2: Uses enhanced restore logic with lastAccessedAt fallback
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
        try {
          await loadFlow(lastFlowId);
        } catch (error) {
          console.error('Failed to restore last flow:', error);
          // Clear invalid reference
          localStorage.removeItem('lastOpenedFlowId');
        }
      }
    };

    restoreLastFlow();
  }, [loadFlow]);

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
  };
}
