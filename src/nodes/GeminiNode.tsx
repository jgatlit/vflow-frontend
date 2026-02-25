import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';
import { supportsStructuredOutput } from '../config/modelCapabilities';
import { csvFieldsToJsonSchema, jsonSchemaToCSVFields, jsonSchemaToMarkdown, csvFieldsToMarkdown } from '../utils/formatConversion';
import { ToolSelector } from '../components/tools/ToolSelector';
import { ToolConfigModal } from '../components/tools/ToolConfigModal';
import { AVAILABLE_TOOLS } from '../config/tools';

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
  // Tool support
  toolsEnabled?: boolean;
  enabledTools?: string[];
  toolConfigs?: Record<string, any>;
  // Agent mode
  agentMode?: boolean;
  maxSteps?: number;
  // Bypass toggle
  bypassed?: boolean;
}

// Detect media URLs in text (similar to backend logic)
const detectMediaUrl = (text: string): boolean => {
  if (!text) return false;
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = text.match(urlPattern);
  if (!urls) return false;

  // Check if any URL is a media URL
  const mediaPatterns = [
    /youtube\.com|youtu\.be/i,  // YouTube
    /\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|avi|mov|mkv|pdf|mp3|wav|ogg|m4a|aac)($|\?)/i  // Media files
  ];

  return urls.some(url => mediaPatterns.some(pattern => pattern.test(url)));
};

const GeminiNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as GeminiNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const previousOutputFormatRef = useRef<string | undefined>(nodeData.outputFormat);
  const [copied, setCopied] = useState(false);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [configuringTool, setConfiguringTool] = useState<string | null>(null);

  // Detect if prompt contains media URLs
  const hasMediaUrl = detectMediaUrl(nodeData.userPrompt || '') || detectMediaUrl(nodeData.systemPrompt || '');

  const handleDataChange = (field: keyof GeminiNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  const handleToolToggle = (toolId: string) => {
    const isEnabled = (nodeData.enabledTools || []).includes(toolId);
    const newEnabledTools = isEnabled
      ? (nodeData.enabledTools || []).filter(id => id !== toolId)
      : [...(nodeData.enabledTools || []), toolId];

    updateNodeData(id, { enabledTools: newEnabledTools });
  };

  const handleCopyMarkdown = async () => {
    let markdown = '';

    if (nodeData.outputFormat === 'json' && nodeData.jsonSchema) {
      markdown = jsonSchemaToMarkdown(nodeData.jsonSchema);
    } else if (nodeData.outputFormat === 'csv' && nodeData.csvFields) {
      markdown = csvFieldsToMarkdown(nodeData.csvFields);
    }

    if (markdown) {
      try {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy markdown:', err);
      }
    }
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
      <div className={`bg-white rounded-lg shadow-lg border-2 border-green-500 p-4 ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
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
            <button
              onClick={() => {
                handleDataChange('toolsEnabled', !nodeData.toolsEnabled);
                if (nodeData.toolsEnabled) {
                  handleDataChange('agentMode', false);
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                nodeData.toolsEnabled
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={nodeData.toolsEnabled ? "Disable tools" : "Enable tools"}
            >
              {nodeData.toolsEnabled ? '🔧 Tools ON' : '🔧 Add Tools'}
            </button>
            <button
              onClick={() => handleDataChange('compactMode', !nodeData.compactMode)}
              className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 rounded transition-colors"
              title={nodeData.compactMode ? "Show all settings" : "Compact view"}
            >
              {nodeData.compactMode ? '📋 Expand' : '📝 Compact'}
            </button>
            {hasMediaUrl && (
              <div
                className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200"
                title="Media URL detected - will use multimodal analysis (YouTube, images, PDFs, audio)"
              >
                🔗 URL
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* Tool Bar - Only visible when tools enabled */}
        {nodeData.toolsEnabled && (
          <div className="mb-3 p-2 bg-teal-50 rounded border border-teal-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-teal-800">🔧 Available Tools:</span>
              <button
                onClick={() => setShowToolSelector(true)}
                className="text-xs px-2 py-1 bg-white hover:bg-teal-100 rounded border border-teal-300 transition-colors"
              >
                + Select Tools
              </button>
            </div>
            {nodeData.enabledTools && nodeData.enabledTools.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {nodeData.enabledTools.map((toolId) => (
                  <span
                    key={toolId}
                    className="px-2 py-0.5 bg-white rounded text-xs font-mono text-teal-700 border border-teal-200"
                  >
                    {toolId}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">No tools selected</div>
            )}
          </div>
        )}

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
            {(nodeData.hybridReasoning || hasMediaUrl) && (
              <div className="flex flex-wrap gap-1">
                {nodeData.hybridReasoning && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    🧠 Hybrid Reasoning
                  </span>
                )}
                {hasMediaUrl && (
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
                <optgroup label="Gemini 3 Series (Preview - Nov 2025)">
                  <option value="gemini-3.1-pro">Gemini 3.1 Pro (Latest Flagship)</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (Experimental)</option>
                </optgroup>
                <optgroup label="Gemini 2.5 Series (Stable)">
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Thinking)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                </optgroup>
                <optgroup label="Gemini 2.0 Series">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                </optgroup>
                <optgroup label="Gemini 1.5 Series (Deprecated)">
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
            {/* Multimodal Input: Auto-detected from URLs in prompts - no checkbox needed */}
            {hasMediaUrl && (
              <div className="p-2 bg-purple-50 rounded border border-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-purple-700">🎥</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-800">Multimodal Analysis Enabled</div>
                    <div className="text-xs text-purple-600">Media URL detected - will use Google SDK for video/image/PDF analysis</div>
                  </div>
                </div>
              </div>
            )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      JSON Schema (optional - for strict validation)
                    </label>
                    {nodeData.jsonSchema && nodeData.jsonSchema.trim() && (
                      <button
                        onClick={handleCopyMarkdown}
                        className="text-xs px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors flex items-center gap-1"
                        title="Copy markdown structure for prompt"
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Structure'}
                      </button>
                    )}
                  </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      CSV Fields (comma-separated)
                    </label>
                    {nodeData.csvFields && nodeData.csvFields.trim() && (
                      <button
                        onClick={handleCopyMarkdown}
                        className="text-xs px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors flex items-center gap-1"
                        title="Copy markdown structure for prompt"
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Structure'}
                      </button>
                    )}
                  </div>
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
            {nodeData.model === 'gemini-3-pro-preview' && '🌟 3 Pro: Most intelligent Gemini, dynamic thinking | 1M context | $2/$12 per 1M'}
            {nodeData.model === 'gemini-2.5-pro' && '🧠 2.5 Pro: State-of-the-art thinking model | 1M context | $1.25/$10 per 1M'}
            {nodeData.model === 'gemini-2.5-flash' && '⚡ 2.5 Flash: Best price-performance | 1M context | $0.15/$0.60 per 1M'}
            {nodeData.model === 'gemini-2.5-flash-lite' && '💨 2.5 Flash-Lite: Cost-efficient | 1M context | $0.075/$0.30 per 1M'}
            {nodeData.model === 'gemini-2.0-flash' && '⚡ 2.0 Flash: Next-gen features | 1M context'}
            {nodeData.model === 'gemini-2.0-flash-exp' && '🔬 2.0 Experimental: Free while in preview | 1M context'}
            {nodeData.model === 'gemini-2.0-flash-lite' && '💨 2.0 Flash-Lite: Fast & efficient | 1M context'}
            {nodeData.model === 'gemini-1.5-pro' && '🎯 1.5 Pro: $1.25/$5 per 1M | 2M context (Deprecated)'}
            {nodeData.model === 'gemini-1.5-flash' && '⚡ 1.5 Flash: $0.075/$0.30 per 1M | 1M context (Deprecated)'}
            {nodeData.model === 'gemini-1.5-flash-8b' && '💨 1.5 Flash-8B: $0.0375/$0.15 per 1M | 1M context (Deprecated)'}
          </div>

          {/* Agent Mode - Only available when tools are enabled */}
          {nodeData.toolsEnabled && (
            <div className="border border-purple-200 rounded p-3 bg-purple-50/50 space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={nodeData.agentMode || false}
                  onChange={(e) => handleDataChange('agentMode', e.target.checked)}
                  className="w-4 h-4"
                  id={`${id}-agent-mode`}
                />
                <label htmlFor={`${id}-agent-mode`} className="text-xs font-semibold text-purple-800">
                  🤖 Agent Mode (multi-step reasoning)
                </label>
              </div>

              {nodeData.agentMode && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Max Steps
                  </label>
                  <input
                    type="number"
                    value={nodeData.maxSteps || 5}
                    onChange={(e) => handleDataChange('maxSteps', parseInt(e.target.value))}
                    min="1"
                    max="20"
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Agent will perform up to {nodeData.maxSteps || 5} reasoning steps
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Tool Selector Modal */}
      {showToolSelector && (
        <ToolSelector
          availableTools={AVAILABLE_TOOLS}
          selectedToolIds={nodeData.enabledTools || []}
          onToggle={handleToolToggle}
          onConfigure={(toolId) => {
            setShowToolSelector(false);
            setConfiguringTool(toolId);
          }}
          onClose={() => setShowToolSelector(false)}
        />
      )}

      {/* Tool Config Modal */}
      {configuringTool && (
        <ToolConfigModal
          tool={AVAILABLE_TOOLS.find(t => t.id === configuringTool)!}
          existingConfig={nodeData.toolConfigs?.[configuringTool]}
          onSave={(config) => {
            const newToolConfigs = {
              ...(nodeData.toolConfigs || {}),
              [configuringTool]: config
            };
            updateNodeData(id, { toolConfigs: newToolConfigs });
            setConfiguringTool(null);
          }}
          onClose={() => setConfiguringTool(null)}
        />
      )}
    </>
  );
});

GeminiNode.displayName = 'GeminiNode';

export default GeminiNode;
