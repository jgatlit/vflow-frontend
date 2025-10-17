import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';

export interface NotesNodeData {
  content: string;
  color: string;
  title: string;
  varMode?: boolean;      // true = process variables, false = passthrough
  minimized?: boolean;    // collapse to minimal view
}

const NotesNode = memo(({ id, data, selected }: NodeProps<NotesNodeData>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

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

  const currentColor = colors[data.color as keyof typeof colors] || colors.yellow;

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
      />
      <div className={`${currentColor.bg} rounded-lg shadow-lg border-2 ${currentColor.border} p-4 ${
        data.varMode ? 'ring-2 ring-purple-300' : ''
      }`}>
        {/* Header */}
        <div className="mb-3">
          <input
            type="text"
            value={data.title || 'Notes'}
            onChange={(e) => handleDataChange('title', e.target.value)}
            className={`font-semibold text-lg ${currentColor.text} bg-transparent border-none outline-none w-full mb-1`}
            placeholder="Note Title..."
          />
          <div className="text-xs text-gray-500">ID: {id}</div>
        </div>

        {/* VAR Mode Toggle */}
        <div className="mb-3 pb-3 border-b border-gray-300">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`var-mode-${id}`}
              checked={data.varMode || false}
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
            {data.varMode ? (
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
                data.color === colorName ? colorClass.border : 'border-transparent'
              } hover:scale-110 transition-transform`}
              title={colorName}
            />
          ))}
        </div>

        {/* Content */}
        <div>
          <textarea
            value={data.content || ''}
            onChange={(e) => handleDataChange('content', e.target.value)}
            className={`w-full min-h-[120px] ${currentColor.bg} ${currentColor.text} border-none outline-none resize-y font-mono text-sm`}
            placeholder={
              data.varMode
                ? "Add template with variables...&#10;&#10;Use {{1}}, {{2}} for inputs&#10;Use {{nodeId}} for specific nodes&#10;&#10;Example:&#10;# Result&#10;Input: {{1}}&#10;Output: Processed..."
                : "Add your notes here...&#10;&#10;Supports markdown:&#10;- **bold**&#10;- *italic*&#10;- # Heading&#10;- - List item&#10;&#10;Enable 'Process Variables' to use {{var}} syntax"
            }
          />
        </div>

        {/* Footer */}
        <div className={`text-xs ${currentColor.text} opacity-70 mt-2`}>
          {data.varMode ? (
            <span>⚡ Variables processed during execution • Reference output: <code className="bg-white/50 px-1 rounded">{`{{${id}}}`}</code></span>
          ) : (
            <span>🔄 Input passes through unchanged • <code className="bg-white/50 px-1 rounded">{`{{${id}}}`}</code> = forwarded input</span>
          )}
        </div>
      </div>

      {/* Always-visible handles with dynamic colors */}
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-4 !h-4 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all ${
          data.varMode ? '!bg-purple-500' : '!bg-blue-500'
        }`}
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-4 !h-4 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all ${
          data.varMode ? '!bg-purple-500' : '!bg-blue-500'
        }`}
        style={{ zIndex: 10 }}
      />
    </>
  );
});

NotesNode.displayName = 'NotesNode';

export default NotesNode;
