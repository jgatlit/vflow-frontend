import { ReactFlow, Background, Controls, MiniMap, applyNodeChanges, applyEdgeChanges, addEdge, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { DragEvent } from 'react';
import { nodeTypes } from './nodes';
import NodePalette from './components/NodePalette';
import TopBar from './components/TopBar';
import FlowListSidebar from './components/FlowListSidebar';
import ExecutionPanel, { type ExecutionHistory } from './components/ExecutionPanel';
import VersionDisplay from './components/VersionDisplay';
import { executeFlow, executeFlowWithTrace } from './services/executionService';
import type { ExecutionResult } from './utils/executionEngine';
import { useFlowStore } from './store/flowStore';
import { useFlowPersistence } from './hooks/useFlowPersistence';
import { TraceCacheProvider } from './contexts/TraceCacheContext';
import { loadExecutionHistory, saveExecutionWithTrace } from './db/database';
import { fetchExecutionHistory, completeBackendExecution, type ExecutionHistoryItem } from './services/executionService';

function AppContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showFlows, setShowFlows] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [currentExecution, setCurrentExecution] = useState<Map<string, ExecutionResult> | null>(null);

  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const addNode = useFlowStore((state) => state.addNode);

  // Flow persistence hook
  const {
    currentFlowId,
    currentFlowName,
    autosaveStatus,
    lastSavedAt,
    isDirty,
    saveFlow,
    loadFlow,
    newFlow,
    renameFlow,
    importFlow,
  } = useFlowPersistence({ autosaveEnabled: true, autosaveDelayMs: 2000 });

  // Load execution history when flow changes (Cache → Frontend → Backend)
  useEffect(() => {
    if (!currentFlowId) {
      // No flow loaded - clear history
      setExecutionHistory([]);
      return;
    }

    async function loadHistory() {
      try {
        console.log(`[App] Loading execution history for flow ${currentFlowId}`);

        // Priority 1: Try frontend IndexedDB cache
        const frontendHistory = await loadExecutionHistory(currentFlowId, 10);

        if (frontendHistory.length > 0) {
          console.log(`[App] Loaded ${frontendHistory.length} executions from IndexedDB`);
          setExecutionHistory(frontendHistory);
          return;
        }

        console.log('[App] No frontend cache - trying backend API');

        // Priority 2: Fallback to backend API
        const backendHistory = await fetchExecutionHistory(currentFlowId, 10);

        if (backendHistory.length > 0) {
          console.log(`[App] Loaded ${backendHistory.length} executions from backend`);

          // Convert backend format to frontend ExecutionHistory format
          const convertedHistory: ExecutionHistory[] = backendHistory.map((exec: ExecutionHistoryItem) => {
            // Convert results array to Map
            const resultsMap = new Map<string, ExecutionResult>();
            exec.results.forEach(result => {
              resultsMap.set(result.nodeId, result);
            });

            // Determine status based on backend status
            let historyStatus: 'success' | 'error' | 'partial';
            if (exec.status === 'completed') {
              const hasErrors = exec.results.some(r => r.error);
              historyStatus = hasErrors ? 'partial' : 'success';
            } else if (exec.status === 'failed') {
              historyStatus = 'error';
            } else {
              historyStatus = 'partial';
            }

            return {
              id: exec.id,
              timestamp: exec.startedAt,
              results: resultsMap,
              status: historyStatus,
              traceId: exec.parentTraceId,
              flowName: exec.flowName,
            };
          });

          setExecutionHistory(convertedHistory);
          return;
        }

        console.log('[App] No execution history found for this flow');
      } catch (error) {
        console.error('[App] Failed to load execution history:', error);
        // Don't show error to user - just log it
        // Execution history is not critical for app functionality
      }
    }

    loadHistory();
  }, [currentFlowId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(addEdge(params, edges));
    },
    [edges, setEdges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Generate unique ID based on existing nodes
      const existingIds = nodes.map(n => {
        const numId = parseInt(n.id);
        return isNaN(numId) ? 0 : numId;
      });
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = `${maxId + 1}`;

      // Default data based on node type
      let defaultData: any = {};

      if (type === 'openai') {
        defaultData = {
          model: 'gpt-5',
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: '',
          userPrompt: '',
        };
      } else if (type === 'anthropic') {
        defaultData = {
          model: 'claude-sonnet-4-5-20250929',
          temperature: 1.0,
          maxTokens: 4000,
          thinkingBudget: 10000,
          systemPrompt: '',
          userPrompt: '',
          extendedThinking: false,
        };
      } else if (type === 'gemini') {
        defaultData = {
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: '',
          userPrompt: '',
          hybridReasoning: false,
          multimodal: false,
        };
      } else if (type === 'notes') {
        defaultData = {
          title: 'Notes',
          content: '',
          color: 'yellow',
        };
      } else if (type === 'python') {
        defaultData = {
          code: '# Python code here\nresult = "Hello from Python"',
          outputVariable: 'result',
        };
      } else if (type === 'javascript') {
        defaultData = {
          code: '// JavaScript code here\nconst result = "Hello from JavaScript";\nreturn result;',
          outputVariable: 'result',
        };
      } else if (type === 'tool-augmented-llm') {
        defaultData = {
          provider: 'anthropic',
          model: 'claude-sonnet-4-5-20250929',
          temperature: 0.7,
          maxTokens: 4000,
          systemPrompt: 'You are a helpful assistant with access to tools.',
          userPrompt: '',
          toolsEnabled: true,
          enabledTools: [],
          toolConfigs: {},
          maxToolCalls: 5,
          toolBarCollapsed: false,
          statusPanelCollapsed: false,
        };
      }

      const newNode = {
        id: newId,
        type,
        position,
        data: defaultData,
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode, nodes]
  );

  const handleExecute = useCallback(async (inputVariables: Record<string, string>) => {
    if (nodes.length === 0) {
      alert('No nodes to execute');
      return;
    }

    setIsExecuting(true);
    setCurrentExecution(null);

    try {
      // Use new unified parent trace execution
      const { executionId, traceId, results } = await executeFlowWithTrace(
        nodes,
        edges,
        inputVariables
      );

      console.log('[App] Flow execution completed:', {
        executionId,
        traceId,
        nodeCount: results.size,
      });

      // Update current execution display (NEW REQUIREMENT: persist until manually changed)
      setCurrentExecution(results);

      // Store execution results in flow store for Notes nodes to access
      useFlowStore.getState().setExecutionResults(results);

      // Calculate status
      const resultsArray = Array.from(results.values());
      const hasErrors = resultsArray.some(r => r.error);
      const status = hasErrors ? 'failed' : 'completed';

      // Save to backend database (best effort - don't fail if this errors)
      if (currentFlowId) {
        await completeBackendExecution(
          executionId,
          resultsArray,
          status,
          traceId,
          hasErrors ? resultsArray.find(r => r.error)?.error : undefined,
          currentFlowId,
          currentFlowName || 'Untitled Flow',
          '1.0.0'
        );

        // Save to IndexedDB (local persistence)
        await saveExecutionWithTrace(
          executionId,
          resultsArray,
          traceId,
          {
            status,
            error: hasErrors ? resultsArray.find(r => r.error)?.error : undefined
          }
        );
      }

      // Add to React state history (immediate UI update)
      const newHistory: ExecutionHistory = {
        id: executionId,
        timestamp: new Date().toISOString(),
        results,
        status: hasErrors ? 'error' : 'success',
        traceId, // Store parent trace ID for "View Trace" button
        flowName: currentFlowName || 'Untitled Flow',
      };
      setExecutionHistory([newHistory, ...executionHistory].slice(0, 10)); // Keep last 10

    } catch (error: any) {
      alert(`Execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, currentFlowId, executionHistory]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
      <TopBar
        onHistoryClick={() => setShowHistory(!showHistory)}
        onFlowsToggle={() => setShowFlows(!showFlows)}
        onRunFlow={() => handleExecute({})}
        onSaveFlow={() => saveFlow()}
        onNewFlow={newFlow}
        onImportFlow={importFlow}
        isExecuting={isExecuting}
        historyCount={executionHistory.length}
        showFlows={showFlows}
        flowName={currentFlowName}
        autosaveStatus={autosaveStatus}
        lastSavedAt={lastSavedAt}
        isDirty={isDirty}
        onFlowNameChange={renameFlow}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap />
        <NodePalette />
        <VersionDisplay />
        <ExecutionPanel
          isExecuting={isExecuting}
          showHistory={showHistory}
          onExecute={handleExecute}
          onToggleHistory={() => setShowHistory(!showHistory)}
          executionHistory={executionHistory}
          currentExecution={currentExecution}
          onSetCurrentExecution={setCurrentExecution}
        />
      </ReactFlow>
      <FlowListSidebar
        isOpen={showFlows}
        currentFlowId={currentFlowId}
        onLoadFlow={loadFlow}
        onNewFlow={newFlow}
        onClose={() => setShowFlows(false)}
      />
    </div>
  );
}

// Wrap AppContent with ReactFlowProvider and TraceCacheProvider
function App() {
  return (
    <ReactFlowProvider>
      <TraceCacheProvider>
        <AppContent />
      </TraceCacheProvider>
    </ReactFlowProvider>
  );
}

export default App;
