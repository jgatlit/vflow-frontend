import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';

export interface GeminiNodeData {
  title?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
  hybridReasoning: boolean;
  multimodal: boolean;
}

const GeminiNode = memo(({ id, data, selected }: NodeProps<GeminiNodeData>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const handleDataChange = (field: keyof GeminiNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={350}
        isVisible={selected}
      />
      <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <input
              type="text"
              value={data.title || 'Gemini Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-300 rounded px-1"
              placeholder="Node Title"
            />
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* All configs visible inline */}
        <div className="space-y-3">
          {/* Model and Temperature */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Model
              </label>
              <select
                value={data.model || 'gemini-2.5-flash'}
                onChange={(e) => handleDataChange('model', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash-image">Flash Image (Nano Banana)</option>
                <option value="gemini-pro">Gemini Pro</option>
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
              Max Output Tokens
            </label>
            <input
              type="number"
              value={data.maxTokens || 2000}
              onChange={(e) => handleDataChange('maxTokens', parseInt(e.target.value))}
              min="1"
              max="8000"
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>

          {/* Feature Toggles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.hybridReasoning || false}
                onChange={(e) => handleDataChange('hybridReasoning', e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-xs font-medium text-gray-600">
                Hybrid Reasoning Mode
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.multimodal || false}
                onChange={(e) => handleDataChange('multimodal', e.target.checked)}
                className="w-4 h-4"
                title="Enable analysis of images, videos (YouTube), PDFs, and audio files"
              />
              <label className="text-xs font-medium text-gray-600" title="Supports: YouTube videos, images (JPG/PNG/WebP), PDFs, and audio files">
                Multimodal Input (video, images, PDF, audio)
              </label>
            </div>
          </div>

          {/* System Prompt */}
          <VariableTextarea
            label="System Instruction"
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
          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-gray-600">
            <span className="font-semibold">💡 Output:</span> Reference this node's result using{' '}
            <code className="bg-white px-1 py-0.5 rounded font-mono text-green-700">{`{{${id}}}`}</code>
          </div>

          {/* Model Info */}
          <div className="mt-2 text-xs text-green-600 bg-green-50 rounded px-2 py-1">
            {data.model === 'gemini-2.5-flash' && '⚡ Fast: $0.30/$2.50 per 1M | 1M context'}
            {data.model === 'gemini-2.5-pro' && '🎯 Pro: $1.25/$10 per 1M | 2M context'}
            {data.model === 'gemini-2.5-flash-image' && '🖼️ Image: $0.039 per image'}
            {!data.model?.includes('gemini-2.5') && '💡 Standard Gemini model'}
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-green-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-green-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
});

GeminiNode.displayName = 'GeminiNode';

export default GeminiNode;
