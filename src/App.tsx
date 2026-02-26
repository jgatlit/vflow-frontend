import { ReactFlow, Background, Controls, MiniMap, applyNodeChanges, applyEdgeChanges, addEdge, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { DragEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Toaster, toast } from 'sonner';
import { nodeTypes } from './nodes';
import NodePalette from './components/NodePalette';
import TopBar from './components/TopBar';
import FlowListSidebar from './components/FlowListSidebar';
import ExecutionPanel, { type ExecutionHistory } from './components/ExecutionPanel';
import VersionDisplay from './components/VersionDisplay';
import RateLimitAlert from './components/RateLimitAlert';
import { SaveAsModal } from './components/SaveAsModal';
import { executeFlow, executeFlowWithTrace, executeFlowAsyncWithPolling } from './services/executionService';
import type { ExecutionResult } from './utils/executionEngine';
import { useFlowStore } from './store/flowStore';
import { useFlowPersistence } from './hooks/useFlowPersistence';
import { TraceCacheProvider } from './contexts/TraceCacheContext';
import { validateFlowTokenLimits } from './utils/tokenEstimator';
import { loadExecutionHistory, saveExecutionWithTrace } from './db/database';
import { fetchExecutionHistory, completeBackendExecution, type ExecutionHistoryItem } from './services/executionService';
import { syncFlowsFromBackend, startPeriodicSync } from './services/flowSyncService';

function AppContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showFlows, setShowFlows] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [currentExecution, setCurrentExecution] = useState<Map<string, ExecutionResult> | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter: number } | null>(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
    autosaveEnabled,
    hasBeenManuallyNamed,
    saveFlow,
    loadFlow,
    newFlow,
    renameFlow,
    importFlow,
    forceSave,
    setState,
  } = useFlowPersistence({ autosaveEnabled: true, autosaveDelayMs: 10000 });

  // Sync flows from backend on app mount + periodic background sync
  useEffect(() => {
    let cleanupPeriodicSync: (() => void) | undefined;

    async function initialSync() {
      try {
        setIsSyncing(true);
        console.log('[App] Initial flow sync from backend...');
        await syncFlowsFromBackend();
        console.log('[App] Initial sync completed');

        // Start periodic background sync (every 5 minutes)
        cleanupPeriodicSync = startPeriodicSync();
      } catch (error) {
        console.error('[App] Initial sync failed:', error);
        // Don't show error to user - app still works with local data
      } finally {
        setIsSyncing(false);
      }
    }

    initialSync();

    // Cleanup on unmount
    return () => {
      if (cleanupPeriodicSync) {
        cleanupPeriodicSync();
      }
    };
  }, []); // Run once on mount

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
            // Convert results to Map (handle both object and array formats)
            const resultsMap = new Map<string, ExecutionResult>();

            if (exec.results) {
              if (Array.isArray(exec.results)) {
                // Array format: [{ nodeId: "1", ... }]
                exec.results.forEach(result => {
                  resultsMap.set(result.nodeId, result);
                });
              } else if (typeof exec.results === 'object') {
                // Object format: { "1": { nodeId: "1", ... } }
                Object.entries(exec.results).forEach(([nodeId, result]) => {
                  resultsMap.set(nodeId, result as ExecutionResult);
                });
              }
            }

            // Determine status based on backend status
            let historyStatus: 'success' | 'error' | 'partial';
            if (exec.status === 'completed') {
              const hasErrors = exec.results && (
                Array.isArray(exec.results)
                  ? exec.results.some(r => r.error)
                  : Object.values(exec.results).some((r: any) => r.error)
              );
              historyStatus = hasErrors ? 'partial' : 'success';
            } else if (exec.status === 'failed' || exec.status === 'rate_limited') {
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

  // Handle Save As modal workflow
  const handleSaveClick = useCallback(() => {
    // Show modal if autosave is disabled (first save after load/import/new)
    if (!autosaveEnabled) {
      setShowSaveAsModal(true);
    } else {
      // Direct save if autosave already enabled
      saveFlow().catch((error) => {
        toast.error('Failed to save flow', {
          description: error.message,
        });
      });
    }
  }, [autosaveEnabled, saveFlow]);

  // Save As handler - enables autosave after first save
  const handleSaveAs = useCallback(async (name: string, overwrite: boolean) => {
    try {
      if (overwrite && currentFlowId) {
        // Overwrite existing flow
        await saveFlow(name);
        toast.success('Flow updated successfully', {
          description: `"${name}" has been saved`,
        });
      } else {
        // Create new flow
        await saveFlow(name);
        toast.success('Flow created successfully', {
          description: `"${name}" has been saved. Autosave is now enabled.`,
        });
      }

      // CRITICAL FIX: Enable autosave after first successful save
      setState(prev => ({
        ...prev,
        autosaveEnabled: true,
        hasBeenManuallyNamed: true,
      }));
    } catch (error: any) {
      toast.error('Failed to save flow', {
        description: error.message,
      });
      throw error; // Re-throw to let modal handle it
    }
  }, [currentFlowId, saveFlow, setState]);

  // Handle autosave enable from inline rename (Path 2)
  const handleAutosaveEnable = useCallback(() => {
    setState(prev => ({
      ...prev,
      autosaveEnabled: true,
      hasBeenManuallyNamed: true,
    }));
  }, [setState]);

  // Ctrl+S / Cmd+S keyboard shortcut
  useHotkeys(
    'ctrl+s, meta+s',
    (e) => {
      e.preventDefault(); // Prevent browser save dialog

      if (!autosaveEnabled) {
        setShowSaveAsModal(true);
      } else {
        forceSave().catch((error) => {
          console.error('Force save failed:', error);
          toast.error('Failed to save flow');
        });
      }
    },
    {
      enableOnFormTags: true, // Allow in input fields
      preventDefault: true,
    },
    [autosaveEnabled, forceSave]
  );

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
          maxTokens: 16000,
          systemPrompt: '',
          userPrompt: '',
        };
      } else if (type === 'anthropic') {
        defaultData = {
          model: 'claude-sonnet-4-5',
          temperature: 1.0,
          maxTokens: 16000,
          thinkingBudget: 32000,
          systemPrompt: '',
          userPrompt: '',
          extendedThinking: false,
        };
      } else if (type === 'gemini') {
        defaultData = {
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 16000,
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
          model: 'claude-sonnet-4-5',
          temperature: 0.7,
          maxTokens: 16000,
          systemPrompt: 'You are a helpful assistant with access to tools.',
          userPrompt: '',
          toolsEnabled: true,
          enabledTools: [],
          toolConfigs: {},
          maxToolCalls: 5,
          toolBarCollapsed: false,
          statusPanelCollapsed: false,
        };
      } else if (type === 'mermaid') {
        defaultData = {
          title: 'Mermaid Diagram',
          outputVariable: newId,
          bypassed: false,
          diagram: 'graph TD\n  A[Start] --> B[End]',
          inputMode: 'auto',
          operation: 'render',
          theme: 'default',
          outputFormat: 'svg-string',
          config: {},
          activePreset: null,
          presets: [],
          presetSelector: '',
          showPreview: true,
          previewSvg: null,
          previewError: null,
          editorCollapsed: false,
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
      toast.warning('No nodes to execute');
      return;
    }

    // Pre-flight token validation
    const tokenValidation = validateFlowTokenLimits(nodes, inputVariables);
    if (!tokenValidation.isValid) {
      const violations = tokenValidation.violations;
      const firstViolation = violations[0];

      toast.error('Context window exceeded', {
        description: `Node "${firstViolation.nodeType}" with model "${firstViolation.modelName}" exceeds context limit (${firstViolation.estimatedTokens.toLocaleString()} tokens estimated vs ${firstViolation.limit.toLocaleString()} limit). ${firstViolation.suggestions.length > 0 ? 'Try: ' + firstViolation.suggestions.join(', ') : 'Reduce input size or use a model with a larger context window.'}`,
        duration: 8000,
      });
      return;
    }

    setIsExecuting(true);
    setCurrentExecution(null);
    setExecutionStatus('Starting execution...');
    setRateLimitInfo(null); // Clear any previous rate limit info

    try {
      // Use async execution with polling (solves Cloudflare 524 timeout)
      const result = await executeFlowAsyncWithPolling(
        nodes,
        edges,
        inputVariables,
        {
          flowId: currentFlowId,
          flowName: currentFlowName,
          onStatusUpdate: (status, execution) => {
            // Update status display for user
            if (status === 'running') {
              setExecutionStatus('Executing workflow...');
              setRateLimitInfo(null); // Clear rate limit when execution resumes
            } else if (status === 'rate_limited') {
              // Rate limit detected - show alert
              setExecutionStatus('Rate limit queue...');
              setRateLimitInfo({ retryAfter: execution?.retryAfter || 60 });
            } else if (status === 'completed') {
              setExecutionStatus('Completed!');
              setRateLimitInfo(null);
            } else if (status === 'failed') {
              setExecutionStatus('Failed');
              setRateLimitInfo(null);
            }
          },
        }
      );

      console.log('[App] Async flow execution completed');

      // Convert results to Map for compatibility with existing code
      const resultsMap = new Map<string, ExecutionResult>();
      if (result.results) {
        Object.entries(result.results).forEach(([nodeId, nodeResult]: [string, any]) => {
          resultsMap.set(nodeId, nodeResult as ExecutionResult);
        });
      }

      // Update current execution display
      setCurrentExecution(resultsMap);

      // Store execution results in flow store for Notes nodes to access
      useFlowStore.getState().setExecutionResults(resultsMap);

      // Add to React state history (immediate UI update)
      const newHistory: ExecutionHistory = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        results: resultsMap,
        status: result.success ? 'success' : 'error',
        flowName: currentFlowName || 'Untitled Flow',
      };
      setExecutionHistory([newHistory, ...executionHistory].slice(0, 10)); // Keep last 10

    } catch (error: any) {
      console.error('[App] Execution failed:', error);
      toast.error('Execution failed', { description: error.message });
      setExecutionStatus('Failed');
      setRateLimitInfo(null);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, currentFlowId, currentFlowName, executionHistory]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
      {/* Toast notifications */}
      <Toaster position="top-right" richColors />

      {/* Rate Limit Alert - Show when rate limited */}
      {rateLimitInfo && (
        <RateLimitAlert
          retryAfter={rateLimitInfo.retryAfter}
          onRetry={() => {
            console.log('[App] Rate limit retry period elapsed');
            setRateLimitInfo(null);
          }}
          onDismiss={() => setRateLimitInfo(null)}
        />
      )}

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={showSaveAsModal}
        onClose={() => setShowSaveAsModal(false)}
        onSave={handleSaveAs}
        currentFlowName={currentFlowName}
        currentFlowId={currentFlowId}
      />

      <TopBar
        onHistoryClick={() => setShowHistory(!showHistory)}
        onFlowsToggle={() => setShowFlows(!showFlows)}
        onRunFlow={() => handleExecute({})}
        onSaveFlow={handleSaveClick}
        onNewFlow={newFlow}
        onImportFlow={importFlow}
        isExecuting={isExecuting}
        executionStatus={executionStatus}
        historyCount={executionHistory.length}
        showFlows={showFlows}
        flowName={currentFlowName}
        autosaveStatus={autosaveStatus}
        lastSavedAt={lastSavedAt}
        isDirty={isDirty}
        autosaveEnabled={autosaveEnabled}
        onFlowNameChange={renameFlow}
        onAutosaveEnable={handleAutosaveEnable}
        isSyncing={isSyncing}
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
