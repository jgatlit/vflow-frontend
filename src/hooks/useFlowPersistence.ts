import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import {
  db,
  createFlowWithMetadata,
  updateFlowWithMetadata,
  accessFlow,
  getLastOpenedFlowId,
  type Flow
} from '../db/database';

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
   * Save current flow to database
   */
  const saveFlow = useCallback(async (flowName?: string): Promise<Flow> => {
    setState(prev => ({ ...prev, autosaveStatus: 'saving' }));

    try {
      const flowObject = toObject();
      const name = flowName || state.currentFlowName;

      let savedFlow: Flow;

      if (state.currentFlowId) {
        // Update existing flow
        savedFlow = await updateFlowWithMetadata(state.currentFlowId, {
          name,
          flow: flowObject,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new flow
        savedFlow = await createFlowWithMetadata(name, flowObject, {
          description: `Flow with ${nodes.length} nodes and ${edges.length} connections`,
          tags: ['auto-generated'],
        });

        // Store in localStorage for quick access
        localStorage.setItem('lastOpenedFlowId', savedFlow.id);
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
   * Load flow from database by ID and apply to canvas
   */
  const loadFlow = useCallback(async (flowId: string) => {
    try {
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
  }, []);

  /**
   * Create new flow (clear current state)
   */
  const newFlow = useCallback(() => {
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
   * Rename current flow
   */
  const renameFlow = useCallback((newName: string) => {
    setState(prev => ({
      ...prev,
      currentFlowName: newName,
      isDirty: true,
    }));
  }, []);

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
   */
  useEffect(() => {
    const restoreLastFlow = async () => {
      const lastFlowId = await getLastOpenedFlowId();

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

  return {
    // State
    ...state,

    // Actions
    saveFlow,
    loadFlow,
    newFlow,
    renameFlow,
  };
}
