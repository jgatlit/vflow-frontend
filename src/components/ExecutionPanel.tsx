import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import ReactMarkdown from 'react-markdown';
import { useFlowStore } from '../store/flowStore';
import type { ExecutionResult } from '../utils/executionEngine';
import { TraceViewerModal } from './TraceViewer/TraceViewerModal';

/**
 * Get default color for node type
 */
function getNodeTypeColor(nodeType?: string): string {
  const typeColors: Record<string, string> = {
    anthropic: '#4A90E2',
    openai: '#10A37F',
    gemini: '#4285F4',
    notes: '#FFD700',
    output: '#9B59B6',
    variable: '#E67E22',
    condition: '#1ABC9C',
    loop: '#E74C3C',
  };

  return typeColors[nodeType?.toLowerCase() || ''] || '#95A5A6';
}

/**
 * Calculate contrast color (white or black) for given background
 */
function getContrastColor(backgroundColor: string): string {
  // Convert color to RGB
  let r = 0, g = 0, b = 0;

  if (backgroundColor.startsWith('#')) {
    const hex = backgroundColor.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (backgroundColor.startsWith('rgb')) {
    const match = backgroundColor.match(/\d+/g);
    if (match) {
      [r, g, b] = match.map(Number);
    }
  }

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export interface ExecutionHistory {
  id: string;
  timestamp: string;
  results: Map<string, ExecutionResult>;
  status: 'success' | 'error' | 'partial';
  traceId?: string;  // Parent trace ID for unified flow execution
  flowName?: string; // Flow name for display in history
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
  showHistory,
  onExecute,
  onToggleHistory,
  executionHistory,
  currentExecution,
  onSetCurrentExecution,
}: ExecutionPanelProps) => {
  const [inputVariables, setInputVariables] = useState<Record<string, string>>({});
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [resultsViewMode, setResultsViewMode] = useState<'markdown' | 'raw'>('markdown');
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);
  const [showTraceViewer, setShowTraceViewer] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  // Panel position and size state with localStorage persistence
  const [panelPosition, setPanelPosition] = useState(() => {
    const saved = localStorage.getItem('executionPanelPosition');
    return saved ? JSON.parse(saved) : {
      x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0,
      y: 60
    };
  });

  const [panelSize, setPanelSize] = useState(() => {
    const saved = localStorage.getItem('executionPanelSize');
    return saved ? JSON.parse(saved) : { width: 400, height: 600 };
  });

  // Save to localStorage when position/size changes
  useEffect(() => {
    localStorage.setItem('executionPanelPosition', JSON.stringify(panelPosition));
  }, [panelPosition]);

  useEffect(() => {
    localStorage.setItem('executionPanelSize', JSON.stringify(panelSize));
  }, [panelSize]);

  // Reset panel position to default
  const resetPanelPosition = () => {
    const defaultPos = {
      x: window.innerWidth - 420,
      y: 60
    };
    const defaultSize = { width: 400, height: 600 };
    setPanelPosition(defaultPos);
    setPanelSize(defaultSize);
  };

  const nodes = useFlowStore((state) => state.nodes);

  /**
   * Copy all execution results to clipboard in markdown format
   */
  const copyAllToClipboard = () => {
    if (!currentExecution) return;

    let markdown = '# Execution Results\n\n';

    Array.from(currentExecution.entries()).forEach(([nodeId, result]) => {
      const node = nodes.find(n => n.id === nodeId);
      const nodeLabel = node?.data?.label || nodeId;
      const nodeType = node?.type?.toUpperCase() || 'UNKNOWN';

      markdown += `## ${nodeLabel} ${nodeType}\n\n`;

      if (result.error) {
        markdown += `**Error:** ${result.error}\n\n`;
      } else {
        markdown += `${result.output}\n\n`;
      }

      markdown += `---\n`;
      markdown += `Executed: ${result.executedAt}\n`;
      if (result.metadata?.tokensUsed) {
        markdown += `Tokens: ${result.metadata.tokensUsed}\n`;
      }
      if (result.metadata?.duration) {
        markdown += `Duration: ${result.metadata.duration}ms\n`;
      }
      markdown += `\n`;
    });

    navigator.clipboard.writeText(markdown).then(() => {
      setCopyAllSuccess(true);
      setTimeout(() => setCopyAllSuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
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

      {/* Execution Results Panel - Draggable & Resizable */}
      {currentExecution && (
        <Rnd
          position={panelPosition}
          size={panelSize}
          onDragStop={(_e, d) => setPanelPosition({ x: d.x, y: d.y })}
          onResizeStop={(_e, _direction, ref, _delta, position) => {
            setPanelSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height)
            });
            setPanelPosition(position);
          }}
          minWidth={300}
          minHeight={200}
          maxWidth={800}
          maxHeight={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
          bounds="window"
          dragHandleClassName="drag-handle"
          style={{ zIndex: 10 }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 h-full overflow-hidden flex flex-col">
            <div className="drag-handle p-4 border-b border-gray-200 flex items-center justify-between cursor-move bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⋮⋮</span>
                <h3 className="font-semibold text-gray-800">Execution Results</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* View Trace button - shows parent trace (unified) or most recent node trace */}
                {(() => {
                  // Check for parent trace ID in execution history (unified flow execution)
                  const parentTraceId = executionHistory[0]?.traceId;

                  // Fallback to individual node trace IDs (backward compatibility)
                  const nodeTraceId = Array.from(currentExecution.entries())
                    .map(([_, result]) => result.traceId)
                    .filter(Boolean)
                    .pop();

                  const traceId = parentTraceId || nodeTraceId;

                  return traceId ? (
                    <button
                      onClick={() => {
                        setSelectedTraceId(traceId);
                        setShowTraceViewer(true);
                      }}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-150"
                      title="View execution trace"
                    >
                      🔍 View Trace
                    </button>
                  ) : null;
                })()}
                <button
                  onClick={copyAllToClipboard}
                  className={`text-xs px-2 py-1 rounded border ${
                    copyAllSuccess
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-white hover:bg-gray-100 border-gray-300'
                  }`}
                  title="Copy all results to clipboard"
                >
                  {copyAllSuccess ? '✓ Copied!' : '📋 Copy All'}
                </button>
                <button
                  onClick={() => setResultsViewMode(mode => mode === 'raw' ? 'markdown' : 'raw')}
                  className="text-xs px-2 py-1 bg-white hover:bg-gray-100 rounded border border-gray-300"
                  title={resultsViewMode === 'raw' ? 'View as markdown' : 'View raw text'}
                >
                  {resultsViewMode === 'raw' ? '📝 Markdown' : '📄 Raw'}
                </button>
                <button
                  onClick={resetPanelPosition}
                  className="text-xs px-2 py-1 bg-white hover:bg-gray-100 rounded border border-gray-300"
                  title="Reset position"
                >
                  ↺
                </button>
                <button
                  onClick={() => onSetCurrentExecution(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
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

              // Get node label and color
              const nodeLabel = node?.data?.label || nodeId;
              const nodeType = node?.type?.toUpperCase() || 'UNKNOWN';
              const nodeColor = node?.style?.backgroundColor || getNodeTypeColor(node?.type);

              return (
                <div key={nodeId} className={`p-3 rounded-lg border ${result.error ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: nodeColor,
                          color: getContrastColor(nodeColor)
                        }}
                      >
                        {nodeLabel} {nodeType}
                      </span>
                      {result.metadata?.multimodalAnalysis?.mediaAccessed && (
                        <span
                          className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium"
                          title={`${result.metadata.multimodalAnalysis.mediaType} analyzed: ${result.metadata.multimodalAnalysis.mediaUrl}`}
                        >
                          {result.metadata.multimodalAnalysis.mediaType === 'video' && '🎥'}
                          {result.metadata.multimodalAnalysis.mediaType === 'image' && '🖼️'}
                          {result.metadata.multimodalAnalysis.mediaType === 'pdf' && '📄'}
                          {result.metadata.multimodalAnalysis.mediaType === 'audio' && '🎵'}
                          {' '}Multimodal
                        </span>
                      )}
                    </div>
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
                  ) : resultsViewMode === 'markdown' ? (
                    <div className="text-sm text-gray-700 max-h-40 overflow-y-auto prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-base font-bold mt-3 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-medium mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="my-1" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-1" {...props} />,
                          code: ({node, inline, ...props}: any) =>
                            inline
                              ? <code className="bg-gray-100 px-1 rounded text-xs font-mono" {...props} />
                              : <code className="block bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto my-1" {...props} />
                        }}
                      >
                        {result.output}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                      {result.output}
                    </div>
                  )}

                  {(result.metadata?.tokensUsed || result.metadata?.multimodalAnalysis) && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      {result.metadata?.tokensUsed && (
                        <span>Tokens: {result.metadata.tokensUsed}</span>
                      )}
                      {result.metadata?.multimodalAnalysis?.processingTime && (
                        <span className="text-purple-600">
                          Media: {result.metadata.multimodalAnalysis.processingTime}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </Rnd>
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
                  {exec.flowName && (
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      {exec.flowName}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">
                    {exec.results.size} nodes executed
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Trace Viewer Modal */}
      {showTraceViewer && selectedTraceId && (
        <TraceViewerModal
          traceId={selectedTraceId}
          onClose={() => {
            setShowTraceViewer(false);
            setSelectedTraceId(null);
          }}
        />
      )}
    </>
  );
};

export default ExecutionPanel;
