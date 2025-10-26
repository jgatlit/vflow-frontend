import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import type { ExecutionResult } from '../utils/executionEngine';

export interface SavedFlow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
  pinLevel: 'none' | 'user' | 'global'; // Pin status
}

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  currentFlowId: string | null;
  savedFlows: SavedFlow[];
  userPinnedFlows: Set<string>; // Device-specific pins
  globalPinnedFlows: Set<string>; // Cross-device global pins (mirrors IndexedDB)
  executionResults: Map<string, ExecutionResult> | null; // Store latest execution results
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  saveFlow: (name: string) => void;
  loadFlow: (flowId: string) => void;
  deleteFlow: (flowId: string) => void;
  clearCanvas: () => void;
  setExecutionResults: (results: Map<string, ExecutionResult> | null) => void;
  togglePin: (flowId: string) => Promise<void>;
  getPinLevel: (flowId: string) => 'none' | 'user' | 'global';
  canDelete: (flowId: string) => boolean;
}

// Helper function to get next pin level in cycle
function getNextPinLevel(current: 'none' | 'user' | 'global'): 'none' | 'user' | 'global' {
  const cycle = ['none', 'user', 'global'] as const;
  const currentIndex = cycle.indexOf(current);
  return cycle[(currentIndex + 1) % 3];
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: [
        {
          id: '1',
          type: 'openai',
          data: {
            model: 'gpt-5',
            temperature: 0.7,
            maxTokens: 1000,
            systemPrompt: 'You are a helpful assistant.',
            userPrompt: '{{input}}\n\nAnalyze the above data and provide insights.',
          },
          position: { x: 250, y: 100 },
        },
      ],
      edges: [],
      currentFlowId: null,
      savedFlows: [],
      userPinnedFlows: new Set<string>(),
      globalPinnedFlows: new Set<string>(),
      executionResults: null,

      setNodes: (nodes) => set({ nodes }),

      setEdges: (edges) => set({ edges }),

      updateNodeData: (nodeId, data) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        })),

      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
        })),

      removeNode: (nodeId) =>
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          edges: state.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
        })),

      addEdge: (edge) =>
        set((state) => ({
          edges: [...state.edges, edge],
        })),

      removeEdge: (edgeId) =>
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
        })),

      saveFlow: (name) => {
        const state = get();
        const now = new Date().toISOString();
        const flowId = state.currentFlowId || `flow-${Date.now()}`;

        const existingFlowIndex = state.savedFlows.findIndex(f => f.id === flowId);

        if (existingFlowIndex >= 0) {
          // Update existing flow
          set((state) => ({
            savedFlows: state.savedFlows.map((flow, index) =>
              index === existingFlowIndex
                ? {
                    ...flow,
                    name,
                    nodes: state.nodes,
                    edges: state.edges,
                    updatedAt: now,
                  }
                : flow
            ),
            currentFlowId: flowId, // Ensure currentFlowId is set on update too
          }));
        } else {
          // Create new flow
          const newFlow: SavedFlow = {
            id: flowId,
            name,
            nodes: state.nodes,
            edges: state.edges,
            createdAt: now,
            updatedAt: now,
            pinLevel: 'none', // Default for new flows
          };
          set((state) => ({
            savedFlows: [...state.savedFlows, newFlow],
            currentFlowId: flowId,
          }));
        }
      },

      loadFlow: (flowId) => {
        const state = get();
        const flow = state.savedFlows.find((f) => f.id === flowId);
        if (flow) {
          set({
            nodes: flow.nodes,
            edges: flow.edges,
            currentFlowId: flowId,
          });
        }
      },

      deleteFlow: (flowId) => {
        const state = get();
        if (!state.canDelete(flowId)) {
          throw new Error('Cannot delete pinned flow. Unpin it first.');
        }

        set((state) => ({
          savedFlows: state.savedFlows.filter((f) => f.id !== flowId),
          currentFlowId: state.currentFlowId === flowId ? null : state.currentFlowId,
        }));
      },

      clearCanvas: () => {
        set({
          nodes: [],
          edges: [],
          currentFlowId: null,
          executionResults: null,
        });
      },

      setExecutionResults: (results) => {
        set({ executionResults: results });
      },

      // Pin management methods
      togglePin: async (flowId: string) => {
        const state = get();
        const currentLevel = state.getPinLevel(flowId);
        const nextLevel = getNextPinLevel(currentLevel);

        console.log('[togglePin] Flow:', flowId);
        console.log('[togglePin] Current level:', currentLevel, '→ Next level:', nextLevel);
        console.log('[togglePin] userPinnedFlows:', Array.from(state.userPinnedFlows));
        console.log('[togglePin] globalPinnedFlows:', Array.from(state.globalPinnedFlows));

        // Import db dynamically to avoid circular dependency
        const { db } = await import('../db/database');

        if (nextLevel === 'user') {
          // Add to local user pins (device-specific via Set)
          set(state => ({
            userPinnedFlows: new Set(state.userPinnedFlows).add(flowId)
          }));
          console.log('[togglePin] Set as user pin (device-specific)');

        } else if (nextLevel === 'global') {
          // Remove from user pins, set as global pin
          const newUserPins = new Set(state.userPinnedFlows);
          newUserPins.delete(flowId);
          set({ userPinnedFlows: newUserPins });

          // Get flow from IndexedDB
          const flow = await db.flows.get(flowId);
          if (!flow) {
            console.error('[togglePin] Flow not found in IndexedDB:', flowId);
            // Rollback
            const restoredUserPins = new Set(state.userPinnedFlows);
            restoredUserPins.add(flowId);
            set({ userPinnedFlows: restoredUserPins });
            return;
          }

          // Sync to backend API
          try {
            console.log('[togglePin] Attempting to set global pin for flow:', flowId);

            // First try to pin the existing flow
            let response = await fetch(`/api/flows/${flowId}/pin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': localStorage.getItem('visual-flow-device-id') || '',
              },
              body: JSON.stringify({ pinLevel: 'global' }),
            });

            // If flow not found (500), create it first then pin
            if (response.status === 500) {
              const errorData = await response.json();
              if (errorData.message === 'Flow not found') {
                console.log('[togglePin] Flow not in backend, syncing flow first...');

                // Sync flow to backend
                const syncResponse = await fetch('/api/flows', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('visual-flow-device-id') || '',
                  },
                  body: JSON.stringify({
                    id: flow.id,
                    name: flow.name,
                    description: flow.description || `Flow with ${flow.flow?.nodes?.length || 0} nodes and ${flow.flow?.edges?.length || 0} connections`,
                    flow: flow.flow,
                    tags: flow.tags || ['auto-generated'],
                    version: flow.version || '1.0.0',
                  }),
                });

                if (!syncResponse.ok) {
                  throw new Error('Failed to sync flow to backend');
                }

                console.log('[togglePin] Flow synced to backend, now pinning...');

                // Retry pin after sync
                response = await fetch(`/api/flows/${flowId}/pin`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('visual-flow-device-id') || '',
                  },
                  body: JSON.stringify({ pinLevel: 'global' }),
                });
              }
            }

            if (!response.ok) {
              const errorText = await response.text();
              console.error('[togglePin] API error response:', response.status, errorText);
              throw new Error(`Failed to pin globally: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log('[togglePin] Successfully pinned globally:', responseData);

            // Update IndexedDB with global pin status
            await db.flows.update(flowId, {
              pinLevel: 'global',
              pinnedAt: new Date().toISOString(),
              pinnedBy: localStorage.getItem('visual-flow-device-id') || 'unknown'
            });

            // Update Zustand state to track global pin
            set(state => ({
              globalPinnedFlows: new Set(state.globalPinnedFlows).add(flowId)
            }));

            console.log('[togglePin] IndexedDB updated with global pin');

          } catch (error) {
            console.error('[togglePin] Failed to pin globally:', error);
            // Rollback: restore user pin
            const restoredUserPins = new Set(state.userPinnedFlows);
            restoredUserPins.add(flowId);
            set({ userPinnedFlows: restoredUserPins });
          }

        } else {
          // Unpin (global → none OR user → none)
          const newUserPins = new Set(state.userPinnedFlows);
          newUserPins.delete(flowId);
          set({ userPinnedFlows: newUserPins });

          // Check if it's a global pin that needs backend unpin
          const flow = await db.flows.get(flowId);
          if (flow?.pinLevel === 'global') {
            // Unpin from backend
            try {
              await fetch(`/api/flows/${flowId}/pin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': localStorage.getItem('visual-flow-device-id') || '',
                },
                body: JSON.stringify({ pinLevel: 'none' }),
              });

              console.log('[togglePin] Unpinned from backend');
            } catch (error) {
              console.error('[togglePin] Failed to unpin from backend:', error);
            }
          }

          // Update IndexedDB to remove pin
          await db.flows.update(flowId, {
            pinLevel: 'none',
            pinnedAt: undefined,
            pinnedBy: undefined
          });

          // Update Zustand state to remove global pin
          const newGlobalPins = new Set(state.globalPinnedFlows);
          newGlobalPins.delete(flowId);
          set({ globalPinnedFlows: newGlobalPins });

          console.log('[togglePin] Set to none (unpinned)');
        }
      },

      getPinLevel: (flowId: string) => {
        const state = get();

        if (state.globalPinnedFlows.has(flowId)) return 'global';
        if (state.userPinnedFlows.has(flowId)) return 'user';
        return 'none';
      },

      canDelete: (flowId: string) => {
        return get().getPinLevel(flowId) === 'none';
      },
    }),
    {
      name: 'flow-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        currentFlowId: state.currentFlowId,
        savedFlows: state.savedFlows,
        userPinnedFlows: Array.from(state.userPinnedFlows), // Convert Set to Array for persistence
        globalPinnedFlows: Array.from(state.globalPinnedFlows), // Convert Set to Array for persistence
      }),
      merge: (persistedState: any, currentState: FlowState) => {
        // Convert userPinnedFlows array back to Set on load
        // Ensure all savedFlows have pinLevel property for backward compatibility
        const savedFlows = (persistedState?.savedFlows || []).map((flow: any) => ({
          ...flow,
          pinLevel: flow.pinLevel || 'none',
        }));

        return {
          ...currentState,
          ...persistedState,
          savedFlows,
          userPinnedFlows: new Set(persistedState?.userPinnedFlows || []),
          globalPinnedFlows: new Set(persistedState?.globalPinnedFlows || []),
        };
      },
    }
  )
);
