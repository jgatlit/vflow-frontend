import { ReactFlow, Background, Controls, MiniMap, applyNodeChanges, applyEdgeChanges, addEdge, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useRef, useState } from 'react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { DragEvent } from 'react';
import { nodeTypes } from './nodes';
import NodePalette from './components/NodePalette';
import TopBar from './components/TopBar';
import FlowListSidebar from './components/FlowListSidebar';
import ExecutionPanel, { type ExecutionHistory } from './components/ExecutionPanel';
import { executeFlow } from './services/executionService';
import type { ExecutionResult } from './utils/executionEngine';
import { useFlowStore } from './store/flowStore';
import { useFlowPersistence } from './hooks/useFlowPersistence';

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
  } = useFlowPersistence({ autosaveEnabled: true, autosaveDelayMs: 2000 });

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
      const results = await executeFlow(nodes, edges, inputVariables, {
        flowId: currentFlowId || undefined,
        flowName: currentFlowName,
        flowVersion: '1.0.0', // TODO: Get from flow metadata
        trackExecution: true, // Enable execution tracking
      });
      setCurrentExecution(results);

      // Add to history
      const hasErrors = Array.from(results.values()).some(r => r.error);
      const newHistory: ExecutionHistory = {
        id: `exec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        results,
        status: hasErrors ? 'error' : 'success',
      };
      setExecutionHistory([newHistory, ...executionHistory].slice(0, 10)); // Keep last 10

    } catch (error: any) {
      alert(`Execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, executionHistory, currentFlowId, currentFlowName]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
      <TopBar
        onHistoryClick={() => setShowHistory(!showHistory)}
        onFlowsToggle={() => setShowFlows(!showFlows)}
        onRunFlow={() => handleExecute({})}
        onSaveFlow={() => saveFlow()}
        onNewFlow={newFlow}
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
      >
        <Background />
        <Controls />
        <MiniMap />
        <NodePalette />
        <FlowListSidebar
          isOpen={showFlows}
          currentFlowId={currentFlowId}
          onLoadFlow={loadFlow}
          onNewFlow={newFlow}
        />
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
    </div>
  );
}

// Wrap AppContent with ReactFlowProvider
function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
