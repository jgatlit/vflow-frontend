import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';

export interface AnthropicNodeData {
  title?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingBudget?: number;
  systemPrompt: string;
  userPrompt: string;
  extendedThinking: boolean;
  compactMode?: boolean;
}

const AnthropicNode = memo(({ id, data, selected }: NodeProps<AnthropicNodeData>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const handleDataChange = (field: keyof AnthropicNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={350}
        isVisible={selected}
      />
      <div className="bg-white rounded-lg shadow-lg border-2 border-purple-500 p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🧠</span>
            <input
              type="text"
              value={data.title || 'Anthropic Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1"
              placeholder="Node Title"
            />
            <button
              onClick={() => handleDataChange('compactMode', !data.compactMode)}
              className="text-xs px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
              title={data.compactMode ? "Show all settings" : "Compact view"}
            >
              {data.compactMode ? '📋 Expand' : '📝 Compact'}
            </button>
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* Conditional: Compact or Full View */}
        {data.compactMode ? (
          /* Compact View - Summary Only */
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">Model:</span>
              <span>{data.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Config:</span>
              <span>Temp {data.temperature} • {data.maxTokens} tokens</span>
            </div>
            {data.extendedThinking && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  🧠 Extended Thinking ({data.thinkingBudget} tokens)
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              Click 📋 Expand to edit settings
            </div>
          </div>
        ) : (
          /* Full View - All Configs */
          <div className="space-y-3">
            {/* Model and Temperature */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Model
                </label>
                <select
                  value={data.model || 'claude-sonnet-4-5-20250929'}
                  onChange={(e) => handleDataChange('model', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                  <option value="claude-sonnet-3-5-20241022">Sonnet 3.5</option>
                  <option value="claude-opus-4-1-20250620">Opus 4.1</option>
                  <option value="claude-opus-4-20250514">Opus 4</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  value={data.temperature || 1.0}
                  onChange={(e) => handleDataChange('temperature', parseFloat(e.target.value))}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
            </div>

            {/* Max Tokens and Thinking Budget */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={data.maxTokens || 4000}
                  onChange={(e) => handleDataChange('maxTokens', parseInt(e.target.value))}
                  min="1"
                  max="8000"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Thinking Budget
                </label>
                <input
                  type="number"
                  value={data.thinkingBudget || 10000}
                  onChange={(e) => handleDataChange('thinkingBudget', parseInt(e.target.value))}
                  min="1000"
                  max="100000"
                  step="1000"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  disabled={!data.extendedThinking}
                />
              </div>
            </div>

            {/* Extended Thinking Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.extendedThinking || false}
                onChange={(e) => handleDataChange('extendedThinking', e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-xs font-medium text-gray-600">
                Extended Thinking Mode (uses thinking budget)
              </label>
            </div>

            {/* System Prompt */}
            <VariableTextarea
              label="System Prompt"
              value={data.systemPrompt || ''}
              onChange={(value) => handleDataChange('systemPrompt', value)}
              placeholder="You are a helpful AI assistant..."
              minHeight="60px"
            />

            {/* User Prompt */}
            <VariableTextarea
              label="User Prompt"
              value={data.userPrompt || ''}
              onChange={(value) => handleDataChange('userPrompt', value)}
              placeholder="{{input}}&#10;&#10;Analyze this data..."
              minHeight="100px"
            />

            {/* Output Reference Help */}
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-gray-600">
              <span className="font-semibold">💡 Output:</span> Reference this node's result using{' '}
              <code className="bg-white px-1 py-0.5 rounded font-mono text-purple-700">{`{{${id}}}`}</code>
            </div>

            {/* Cost Info */}
            <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
              💰 Cost: $3/$15 per 1M tokens | Batch: 50% off
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
});

AnthropicNode.displayName = 'AnthropicNode';

export default AnthropicNode;
