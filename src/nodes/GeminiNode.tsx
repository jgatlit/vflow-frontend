import { memo, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';
import { supportsStructuredOutput } from '../config/modelCapabilities';
import { csvFieldsToJsonSchema, jsonSchemaToCSVFields } from '../utils/formatConversion';

export interface GeminiNodeData {
  title?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
  hybridReasoning: boolean;
  multimodal: boolean;
  compactMode?: boolean;
  outputVariable?: string;
  // Structured output fields
  outputFormat?: 'text' | 'json' | 'csv';
  jsonSchema?: string;  // JSON schema as string
  csvFields?: string;   // Comma-separated field names
}

const GeminiNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as GeminiNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const previousOutputFormatRef = useRef<string | undefined>(nodeData.outputFormat);

  const handleDataChange = (field: keyof GeminiNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  // Auto-convert between CSV and JSON formats when output format changes
  useEffect(() => {
    const previousFormat = previousOutputFormatRef.current;
    const currentFormat = nodeData.outputFormat;

    // Skip if this is the initial render (previousFormat is undefined)
    if (previousFormat === undefined) {
      previousOutputFormatRef.current = currentFormat;
      return;
    }

    // Skip if format hasn't actually changed
    if (previousFormat === currentFormat) {
      return;
    }

    console.log('📝 Output format changed:', previousFormat, '→', currentFormat);
    console.log('📝 Current data:', { csvFields: nodeData.csvFields, jsonSchema: nodeData.jsonSchema?.substring(0, 100) });

    // Update the ref for next comparison
    previousOutputFormatRef.current = currentFormat;

    // Skip conversion if switching to/from text
    if (previousFormat === 'text' || currentFormat === 'text' || !previousFormat || !currentFormat) {
      return;
    }

    const hasJsonSchema = nodeData.jsonSchema && nodeData.jsonSchema.trim() !== '';
    const hasCsvFields = nodeData.csvFields && nodeData.csvFields.trim() !== '';

    // CSV → JSON conversion
    if (previousFormat === 'csv' && currentFormat === 'json') {
      console.log('🔄 CSV → JSON conversion check. hasCsvFields:', hasCsvFields, 'csvFields:', nodeData.csvFields);
      if (hasCsvFields) {
        const jsonSchema = csvFieldsToJsonSchema(nodeData.csvFields!);
        if (jsonSchema) {
          console.log('✅ Converting CSV to JSON:', nodeData.csvFields, '→', jsonSchema.substring(0, 100));
          updateNodeData(id, { jsonSchema });
        }
      }
    }

    // JSON → CSV conversion
    if (previousFormat === 'json' && currentFormat === 'csv') {
      console.log('🔄 JSON → CSV conversion check. hasJsonSchema:', hasJsonSchema);
      if (hasJsonSchema) {
        const csvFields = jsonSchemaToCSVFields(nodeData.jsonSchema!);
        if (csvFields) {
          console.log('✅ Converting JSON to CSV:', csvFields);
          updateNodeData(id, { csvFields });
        }
      }
    }
  }, [nodeData.outputFormat, nodeData.csvFields, nodeData.jsonSchema, id, updateNodeData]);

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
              value={nodeData.title || 'Gemini Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-300 rounded px-1"
              placeholder="Node Title"
            />
            <button
              onClick={() => handleDataChange('compactMode', !nodeData.compactMode)}
              className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 rounded transition-colors"
              title={nodeData.compactMode ? "Show all settings" : "Compact view"}
            >
              {nodeData.compactMode ? '📋 Expand' : '📝 Compact'}
            </button>
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* Conditional: Compact or Full View */}
        {nodeData.compactMode ? (
          /* Compact View - Summary Only */
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">Model:</span>
              <span>{nodeData.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Config:</span>
              <span>Temp {nodeData.temperature} • {nodeData.maxTokens} tokens</span>
            </div>
            {(nodeData.hybridReasoning || nodeData.multimodal) && (
              <div className="flex flex-wrap gap-1">
                {nodeData.hybridReasoning && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    🧠 Hybrid Reasoning
                  </span>
                )}
                {nodeData.multimodal && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    🎥 Multimodal
                  </span>
                )}
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
                value={nodeData.model || 'gemini-2.5-flash'}
                onChange={(e) => handleDataChange('model', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <optgroup label="Gemini 2.5 Series (Latest)">
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Thinking)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                </optgroup>
                <optgroup label="Gemini 2.0 Series">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                </optgroup>
                <optgroup label="Gemini 1.5 Series (Deprecated Sept 2025)">
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={nodeData.temperature || 0.7}
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
              value={nodeData.maxTokens || 2000}
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
                checked={nodeData.hybridReasoning || false}
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
                checked={nodeData.multimodal || false}
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
            value={nodeData.systemPrompt || ''}
            onChange={(value) => handleDataChange('systemPrompt', value)}
            placeholder="You are a helpful AI assistant..."
            minHeight="60px"
          />

          {/* User Prompt */}
          <VariableTextarea
            label="User Prompt"
            value={nodeData.userPrompt || ''}
            onChange={(value) => handleDataChange('userPrompt', value)}
            placeholder="{{input}}&#10;&#10;Analyze this nodeData..."
            minHeight="100px"
          />

          {/* Structured Output - Only for supported models */}
          {supportsStructuredOutput(nodeData.model) && (
            <div className="border border-green-200 rounded p-3 bg-green-50/50">
              <div className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                <span>📊</span>
                <span>Structured Output</span>
                <span className="text-green-600 font-normal">(optional)</span>
              </div>

              {/* Output Format Selector */}
              <div className="mb-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Output Format
                </label>
                <select
                  value={nodeData.outputFormat || 'text'}
                  onChange={(e) => handleDataChange('outputFormat', e.target.value as 'text' | 'json' | 'csv')}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="text">Text (default)</option>
                  <option value="json">JSON (structured)</option>
                  <option value="csv">CSV (converted from JSON)</option>
                </select>
              </div>

              {/* JSON Schema Input */}
              {nodeData.outputFormat === 'json' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    JSON Schema (optional - for strict validation)
                  </label>
                  <textarea
                    value={nodeData.jsonSchema || ''}
                    onChange={(e) => handleDataChange('jsonSchema', e.target.value)}
                    className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1 resize-y min-h-[60px]"
                    placeholder={'{\n  "type": "object",\n  "properties": {\n    "summary": {"type": "string"},\n    "score": {"type": "number"}\n  }\n}'}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Leave empty for flexible JSON output
                  </div>
                </div>
              )}

              {/* CSV Fields Input */}
              {nodeData.outputFormat === 'csv' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    CSV Fields (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={nodeData.csvFields || ''}
                    onChange={(e) => handleDataChange('csvFields', e.target.value)}
                    className="w-full text-sm font-mono border border-gray-300 rounded px-2 py-1"
                    placeholder="name, email, score, category"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Output will be converted from JSON to CSV format
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Output Reference Help */}
          <div className="mt-3 p-2 bg-green-50 rounded text-xs text-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold">💡 Output:</span>
              <span>Reference using</span>
              <span className="font-mono text-green-700">{'{{'}</span>
              <input
                type="text"
                value={nodeData.outputVariable || id}
                onChange={(e) => handleDataChange('outputVariable', e.target.value)}
                className="bg-white px-1 py-0.5 rounded font-mono text-green-700 border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 hover:border-green-300 transition-colors min-w-[4ch]"
                placeholder={id}
                title="Click to edit output variable name"
                style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
              />
              <span className="font-mono text-green-700">{'}}'}</span>
            </div>

            {/* Show field-specific variables for JSON output */}
            {nodeData.outputFormat === 'json' && (
              <div className="mt-2 pl-4 border-l-2 border-green-300">
                <div className="text-green-700 font-semibold mb-1">Individual fields available as:</div>
                <div className="font-mono text-xs text-green-600 space-y-0.5">
                  <div>{`{{${nodeData.outputVariable || id}.fieldName}}`}</div>
                  <div className="text-gray-500 italic">Example: {`{{${nodeData.outputVariable || id}.name}}`}, {`{{${nodeData.outputVariable || id}.score}}`}</div>
                </div>
              </div>
            )}
          </div>

          {/* Model Info */}
          <div className="mt-2 text-xs text-green-600 bg-green-50 rounded px-2 py-1">
            {nodeData.model === 'gemini-2.5-pro' && '🧠 2.5 Pro: State-of-the-art thinking model | 1M context'}
            {nodeData.model === 'gemini-2.5-flash' && '⚡ 2.5 Flash: Best price-performance | 1M context'}
            {nodeData.model === 'gemini-2.5-flash-lite' && '💨 2.5 Flash-Lite: Cost-efficient | 1M context'}
            {nodeData.model === 'gemini-2.0-flash' && '⚡ 2.0 Flash: Next-gen features | 1M context'}
            {nodeData.model === 'gemini-2.0-flash-exp' && '🔬 2.0 Experimental: Free while in preview | 1M context'}
            {nodeData.model === 'gemini-2.0-flash-lite' && '💨 2.0 Flash-Lite: Fast & efficient | 1M context'}
            {nodeData.model === 'gemini-1.5-pro' && '🎯 1.5 Pro: $1.25/$5 per 1M | 2M context (Deprecated)'}
            {nodeData.model === 'gemini-1.5-flash' && '⚡ 1.5 Flash: $0.075/$0.30 per 1M | 1M context (Deprecated)'}
            {nodeData.model === 'gemini-1.5-flash-8b' && '💨 1.5 Flash-8B: $0.0375/$0.15 per 1M | 1M context (Deprecated)'}
          </div>
          </div>
        )}
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
