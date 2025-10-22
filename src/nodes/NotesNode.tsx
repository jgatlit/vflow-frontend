import { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';

export interface NotesNodeData {
  content: string;
  color: string;
  title: string;
  varMode?: boolean;      // true = process variables, false = passthrough
  minimized?: boolean;    // collapse to minimal view
  outputVariable?: string;
  bypassed?: boolean;     // true = skip execution, false = normal execution
}

/**
 * Helper function to detect and pretty-print JSON content
 */
function formatIfJSON(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // Try to detect JSON by looking for common patterns
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not valid JSON, return as-is
    return content;
  }
}

const NotesNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as NotesNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const executionResults = useFlowStore((state) => state.executionResults);

  // Toggle between template view and result view
  const [showResult, setShowResult] = useState(false);

  // Get execution result for this node
  const executionResult = useMemo(() => {
    return executionResults?.get(id);
  }, [executionResults, id]);

  // Auto-format JSON content for display
  const displayContent = useMemo(() => {
    // If showing result and we have an execution result, display that
    if (showResult && executionResult) {
      return formatIfJSON(executionResult.output || '');
    }
    // Otherwise show the template content
    return formatIfJSON(nodeData.content || '');
  }, [showResult, executionResult, nodeData.content]);

  const handleDataChange = (field: keyof NotesNodeData, value: string | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  const colors = {
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
    green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
    pink: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  };

  const currentColor = colors[nodeData.color as keyof typeof colors] || colors.yellow;

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
      />
      <div className={`${currentColor.bg} rounded-lg shadow-lg border-2 ${currentColor.border} p-4 ${
        nodeData.varMode ? 'ring-2 ring-purple-300' : ''
      } ${nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''}`}>
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="text"
              value={nodeData.title || 'Notes'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className={`font-semibold text-lg ${currentColor.text} bg-transparent border-none outline-none flex-1`}
              placeholder="Note Title..."
            />
            {executionResult && (
              <button
                onClick={() => setShowResult(!showResult)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  showResult
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={showResult ? 'Show template' : 'Show execution result'}
              >
                {showResult ? '📝 Template' : '👁️ Result'}
              </button>
            )}
            <button
              onClick={() => handleDataChange('bypassed', !nodeData.bypassed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                nodeData.bypassed
                  ? 'bg-gray-400 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={nodeData.bypassed ? 'Node is bypassed - click to activate' : 'Node is active - click to bypass'}
            >
              {nodeData.bypassed ? '⏸ Bypassed' : '▶ Active'}
            </button>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>ID: {id}</span>
            {executionResult && showResult && (
              <span className="text-indigo-600 font-medium">
                • Viewing Result ({executionResult.output.length.toLocaleString()} chars)
              </span>
            )}
          </div>
        </div>

        {/* VAR Mode Toggle */}
        <div className="mb-3 pb-3 border-b border-gray-300">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`var-mode-${id}`}
              checked={nodeData.varMode || false}
              onChange={(e) => handleDataChange('varMode', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label
              htmlFor={`var-mode-${id}`}
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              ⚡ Process Variables
            </label>
          </div>

          {/* Mode Indicator */}
          <div className="text-xs">
            {nodeData.varMode ? (
              <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                📝 <strong>Transform Mode:</strong> Processes {'{{'} variables {'}}'} in content. Output = processed markdown.
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                🔄 <strong>Passthrough Mode:</strong> Forwards input → output unchanged. Notes are for documentation only.
              </div>
            )}
          </div>
        </div>

        {/* Color Picker */}
        <div className="flex gap-2 mb-3">
          {Object.entries(colors).map(([colorName, colorClass]) => (
            <button
              key={colorName}
              onClick={() => handleDataChange('color', colorName)}
              className={`w-6 h-6 rounded-full ${colorClass.bg} border-2 ${
                nodeData.color === colorName ? colorClass.border : 'border-transparent'
              } hover:scale-110 transition-transform`}
              title={colorName}
            />
          ))}
        </div>

        {/* Content */}
        <div>
          <textarea
            value={displayContent}
            onChange={(e) => handleDataChange('content', e.target.value)}
            readOnly={showResult}
            className={`w-full min-h-[120px] ${currentColor.bg} ${currentColor.text} border-none outline-none resize-y font-mono text-sm whitespace-pre-wrap ${
              showResult ? 'cursor-default bg-opacity-70' : ''
            }`}
            placeholder={
              showResult
                ? "Execution result will appear here..."
                : nodeData.varMode
                  ? "Add template with variables...&#10;&#10;Use {{1}}, {{2}} for inputs&#10;Use {{nodeId}} for specific nodes&#10;&#10;Example:&#10;# Result&#10;Input: {{1}}&#10;Output: Processed..."
                  : "Add your notes here...&#10;&#10;Supports markdown:&#10;- **bold**&#10;- *italic*&#10;- # Heading&#10;- - List item&#10;&#10;Enable 'Process Variables' to use {{var}} syntax&#10;&#10;JSON will be auto-formatted"
            }
          />
        </div>

        {/* Footer */}
        <div className={`text-xs ${currentColor.text} mt-2 flex items-center gap-1 flex-wrap`}>
          {nodeData.varMode ? (
            <>
              <span>⚡ Variables processed • Reference using</span>
              <span className="font-mono">{'{{'}</span>
              <input
                type="text"
                value={nodeData.outputVariable || id}
                onChange={(e) => handleDataChange('outputVariable', e.target.value)}
                className="bg-white/70 px-1 py-0.5 rounded font-mono border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 hover:border-purple-400 transition-colors min-w-[4ch]"
                placeholder={id}
                title="Click to edit output variable name"
                style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
              />
              <span className="font-mono">{'}}'}</span>
            </>
          ) : (
            <>
              <span>🔄 Passthrough • Reference using</span>
              <span className="font-mono">{'{{'}</span>
              <input
                type="text"
                value={nodeData.outputVariable || id}
                onChange={(e) => handleDataChange('outputVariable', e.target.value)}
                className="bg-white/70 px-1 py-0.5 rounded font-mono border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-colors min-w-[4ch]"
                placeholder={id}
                title="Click to edit output variable name"
                style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
              />
              <span className="font-mono">{'}}'}</span>
            </>
          )}
        </div>
      </div>

      {/* Always-visible handles with dynamic colors */}
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-4 !h-4 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all ${
          nodeData.varMode ? '!bg-purple-500' : '!bg-blue-500'
        }`}
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-4 !h-4 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all ${
          nodeData.varMode ? '!bg-purple-500' : '!bg-blue-500'
        }`}
        style={{ zIndex: 10 }}
      />
    </>
  );
});

NotesNode.displayName = 'NotesNode';

export default NotesNode;
