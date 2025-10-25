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

        if (nextLevel === 'user') {
          // Add to local user pins
          set(state => ({
            userPinnedFlows: new Set(state.userPinnedFlows).add(flowId),
            savedFlows: state.savedFlows.map(f =>
              f.id === flowId ? { ...f, pinLevel: 'none' } : f
            )
          }));
        } else if (nextLevel === 'global') {
          // Remove from user pins, add to global
          const newUserPins = new Set(state.userPinnedFlows);
          newUserPins.delete(flowId);

          set({ userPinnedFlows: newUserPins });

          // Sync to backend
          try {
            const response = await fetch(`/api/flows/${flowId}/pin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': localStorage.getItem('visual-flow-device-id') || '',
              },
              body: JSON.stringify({ pinLevel: 'global' }),
            });

            if (!response.ok) throw new Error('Failed to pin globally');

            set(state => ({
              savedFlows: state.savedFlows.map(f =>
                f.id === flowId ? { ...f, pinLevel: 'global' } : f
              )
            }));
          } catch (error) {
            console.error('Failed to pin globally:', error);
            // Rollback
            set(state => ({
              savedFlows: state.savedFlows.map(f =>
                f.id === flowId ? { ...f, pinLevel: 'none' } : f
              )
            }));
          }
        } else {
          // Unpin (none)
          const newUserPins = new Set(state.userPinnedFlows);
          newUserPins.delete(flowId);

          set({ userPinnedFlows: newUserPins });

          const flow = state.savedFlows.find(f => f.id === flowId);
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

              set(state => ({
                savedFlows: state.savedFlows.map(f =>
                  f.id === flowId ? { ...f, pinLevel: 'none' } : f
                )
              }));
            } catch (error) {
              console.error('Failed to unpin:', error);
            }
          } else {
            set(state => ({
              savedFlows: state.savedFlows.map(f =>
                f.id === flowId ? { ...f, pinLevel: 'none' } : f
              )
            }));
          }
        }
      },

      getPinLevel: (flowId: string) => {
        const state = get();
        const flow = state.savedFlows.find(f => f.id === flowId);

        if (flow?.pinLevel === 'global') return 'global';
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
        };
      },
    }
  )
);
