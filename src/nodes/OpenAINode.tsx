import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';

export interface OpenAINodeData {
  title?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

const OpenAINode = memo(({ id, data, selected }: NodeProps<OpenAINodeData>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const handleDataChange = (field: keyof OpenAINodeData, value: string | number) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={300}
        isVisible={selected}
      />
      <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🤖</span>
            <input
              type="text"
              value={data.title || 'OpenAI Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
              placeholder="Node Title"
            />
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* All configs visible inline - NO MODALS */}
        <div className="space-y-3">
          {/* Model and Temperature Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Model
              </label>
              <select
                value={data.model || 'gpt-5'}
                onChange={(e) => handleDataChange('model', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="gpt-5">GPT-5</option>
                <option value="gpt-5-mini">GPT-5 Mini</option>
                <option value="gpt-5-nano">GPT-5 Nano</option>
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={data.temperature || 0.7}
                onChange={(e) => handleDataChange('temperature', parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={data.maxTokens || 1000}
              onChange={(e) => handleDataChange('maxTokens', parseInt(e.target.value))}
              min="1"
              max="4000"
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>

          {/* System Prompt - Always Visible */}
          <VariableTextarea
            label="System Prompt"
            value={data.systemPrompt || ''}
            onChange={(value) => handleDataChange('systemPrompt', value)}
            placeholder="You are a helpful assistant..."
            minHeight="60px"
          />

          {/* User Prompt - Always Visible */}
          <VariableTextarea
            label="User Prompt"
            value={data.userPrompt || ''}
            onChange={(value) => handleDataChange('userPrompt', value)}
            placeholder="{{input}}&#10;&#10;Analyze this data..."
            minHeight="100px"
          />

          {/* Output Reference Help */}
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-600">
            <span className="font-semibold">💡 Output:</span> Reference this node's result using{' '}
            <code className="bg-white px-1 py-0.5 rounded font-mono text-blue-700">{`{{${id}}}`}</code>
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
});

OpenAINode.displayName = 'OpenAINode';

export default OpenAINode;
