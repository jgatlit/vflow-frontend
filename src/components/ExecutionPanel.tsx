import { useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { executeFlow } from '../services/executionService';
import type { ExecutionResult } from '../utils/executionEngine';

export interface ExecutionHistory {
  id: string;
  timestamp: string;
  results: Map<string, ExecutionResult>;
  status: 'success' | 'error' | 'partial';
}

interface ExecutionPanelProps {
  isExecuting: boolean;
  showHistory: boolean;
  onExecute: (vars: Record<string, string>) => void;
  onToggleHistory: () => void;
  executionHistory: ExecutionHistory[];
  currentExecution: Map<string, ExecutionResult> | null;
  onSetCurrentExecution: (results: Map<string, ExecutionResult> | null) => void;
}

const ExecutionPanel = ({
  isExecuting,
  showHistory,
  onExecute,
  onToggleHistory,
  executionHistory,
  currentExecution,
  onSetCurrentExecution,
}: ExecutionPanelProps) => {
  const [inputVariables, setInputVariables] = useState<Record<string, string>>({});
  const [showInputDialog, setShowInputDialog] = useState(false);

  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const handleExecuteWithInput = () => {
    setShowInputDialog(true);
  };

  return (
    <>
      {/* Input Variables Dialog */}
      {showInputDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[600px] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Input Variables</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Data
                </label>
                <textarea
                  value={inputVariables.input || ''}
                  onChange={(e) => setInputVariables({ ...inputVariables, input: e.target.value })}
                  placeholder="Enter your input data here..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-32"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Variables (JSON)
                </label>
                <textarea
                  placeholder='{"key": "value"}'
                  onChange={(e) => {
                    try {
                      const vars = JSON.parse(e.target.value);
                      setInputVariables({ ...inputVariables, ...vars });
                    } catch {}
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono h-24"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowInputDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInputDialog(false);
                  onExecute(inputVariables);
                }}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results Panel */}
      {currentExecution && (
        <div className="absolute top-12 right-4 z-10 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Execution Results</h3>
            <button
              onClick={() => onSetCurrentExecution(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {Array.from(currentExecution.entries()).map(([nodeId, result]) => {
              const node = nodes.find(n => n.id === nodeId);

              const copyToClipboard = () => {
                const markdown = `## ${node?.type?.toUpperCase()} Node (${nodeId})\n\n${result.output}\n\n---\nExecuted: ${result.executedAt}\nTokens: ${result.metadata?.tokensUsed || 'N/A'}\nDuration: ${result.metadata?.duration}ms`;
                navigator.clipboard.writeText(markdown);
              };

              const saveToFile = () => {
                const markdown = `## ${node?.type?.toUpperCase()} Node (${nodeId})\n\n${result.output}\n\n---\nExecuted: ${result.executedAt}\nTokens: ${result.metadata?.tokensUsed || 'N/A'}\nDuration: ${result.metadata?.duration}ms`;
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${node?.type}-${nodeId}-${Date.now()}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              };

              return (
                <div key={nodeId} className={`p-3 rounded-lg border ${result.error ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {node?.type?.toUpperCase()} Node
                    </span>
                    <div className="flex items-center gap-2">
                      {!result.error && (
                        <>
                          <button
                            onClick={copyToClipboard}
                            className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-100 transition-colors"
                            title="Copy to clipboard"
                          >
                            📋
                          </button>
                          <button
                            onClick={saveToFile}
                            className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-100 transition-colors"
                            title="Save to file"
                          >
                            💾
                          </button>
                        </>
                      )}
                      <span className="text-xs text-gray-500">
                        {result.metadata?.duration}ms
                      </span>
                    </div>
                  </div>

                  {result.error ? (
                    <div className="text-sm text-red-600">
                      Error: {result.error}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {result.output}
                    </div>
                  )}

                  {result.metadata?.tokensUsed && (
                    <div className="text-xs text-gray-500 mt-2">
                      Tokens: {result.metadata.tokensUsed}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="absolute top-12 right-4 z-10 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Execution History</h3>
            <button
              onClick={onToggleHistory}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {executionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No execution history yet</p>
            ) : (
              executionHistory.map((exec) => (
                <div
                  key={exec.id}
                  onClick={() => onSetCurrentExecution(exec.results)}
                  className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${exec.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {exec.status === 'success' ? '✓ Success' : '✗ Error'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(exec.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {exec.results.size} nodes executed
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ExecutionPanel;
