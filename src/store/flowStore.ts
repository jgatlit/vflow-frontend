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
}

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  currentFlowId: string | null;
  savedFlows: SavedFlow[];
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
    }),
    {
      name: 'flow-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        currentFlowId: state.currentFlowId,
        savedFlows: state.savedFlows,
      }),
    }
  )
);
