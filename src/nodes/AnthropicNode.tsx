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
import { supportsTools } from '../config/models';

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
  outputVariable?: string;
  // Structured output fields
  outputFormat?: 'text' | 'json' | 'csv';
  jsonSchema?: string;  // JSON schema as string
  csvFields?: string;   // Comma-separated field names

  // NEW: Tool support
  toolsEnabled?: boolean;
  enabledTools?: string[];
  toolConfigs?: Record<string, any>;

  // NEW: Agent mode support
  agentMode?: boolean;
  maxSteps?: number;

  // Bypass toggle
  bypassed?: boolean;
}

const AnthropicNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as AnthropicNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const previousOutputFormatRef = useRef<string | undefined>(nodeData.outputFormat);
  const [copied, setCopied] = useState(false);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [configuringTool, setConfiguringTool] = useState<string | null>(null);

  const handleDataChange = (field: keyof AnthropicNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  const toggleTools = () => {
    const newState = !nodeData.toolsEnabled;
    updateNodeData(id, {
      toolsEnabled: newState,
      enabledTools: newState ? (nodeData.enabledTools || []) : undefined,
      agentMode: newState ? (nodeData.agentMode || false) : undefined,
    });
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
      <div className="bg-white rounded-lg shadow-lg border-2 border-purple-500 p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🧠</span>
            <input
              type="text"
              value={nodeData.title || 'Anthropic Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1"
              placeholder="Node Title"
            />

            {/* Tools Toggle Button */}
            {supportsTools('anthropic', nodeData.model) && (
              <button
                onClick={toggleTools}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  nodeData.toolsEnabled
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Enable tools"
              >
                {nodeData.toolsEnabled ? '🔧 Tools ON' : '🔧 Add Tools'}
              </button>
            )}

            {/* Compact Toggle */}
            <button
              onClick={() => handleDataChange('compactMode', !nodeData.compactMode)}
              className="text-xs px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
              title={nodeData.compactMode ? "Show all settings" : "Compact view"}
            >
              {nodeData.compactMode ? '📋 Expand' : '📝 Compact'}
            </button>
          </div>
          <div className="text-xs text-gray-500 ml-10">ID: {id}</div>
        </div>

        {/* Conditional: Tool Bar */}
        {nodeData.toolsEnabled && (
          <div className="mb-3 p-2 bg-teal-50 rounded border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-800">
                Tools ({nodeData.enabledTools?.length || 0})
              </span>
              <button
                onClick={() => setShowToolSelector(true)}
                className="text-xs px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded"
              >
                Select Tools
              </button>
            </div>

            {nodeData.enabledTools && nodeData.enabledTools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {nodeData.enabledTools.map(toolId => {
                  const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                  return (
                    <span
                      key={toolId}
                      className="px-2 py-0.5 bg-white text-teal-700 text-xs rounded border border-teal-300 flex items-center gap-1"
                    >
                      <span>{tool?.icon || '🔧'}</span>
                      <span>{tool?.displayName || toolId}</span>
                    </span>
                  );
                })}
              </div>
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
            {nodeData.extendedThinking && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  🧠 Extended Thinking ({nodeData.thinkingBudget} tokens)
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
                  value={nodeData.model || 'claude-sonnet-4-5-20250929'}
                  onChange={(e) => handleDataChange('model', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <optgroup label="Claude 4.5 Series (Latest - Nov 2025)">
                    <option value="claude-opus-4-5-20251101">Claude Opus 4.5 (Most Intelligent)</option>
                    <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Best Coding)</option>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fastest)</option>
                  </optgroup>
                  <optgroup label="Claude 4 Series">
                    <option value="claude-opus-4-1-20250710">Claude Opus 4.1</option>
                    <option value="claude-opus-4-20250514">Claude Opus 4</option>
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                  </optgroup>
                  <optgroup label="Claude 3.7 Series">
                    <option value="claude-sonnet-3-7-20250219">Claude 3.7 Sonnet</option>
                  </optgroup>
                  <optgroup label="Claude 3.5 Series (Legacy)">
                    <option value="claude-sonnet-3-5-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-sonnet-3-5-20240620">Claude 3.5 Sonnet (June)</option>
                  </optgroup>
                  <optgroup label="Claude 3 Series (Legacy)">
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  value={nodeData.temperature || 1.0}
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
                  value={nodeData.maxTokens || 4000}
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
                  value={nodeData.thinkingBudget || 10000}
                  onChange={(e) => handleDataChange('thinkingBudget', parseInt(e.target.value))}
                  min="1000"
                  max="100000"
                  step="1000"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  disabled={!nodeData.extendedThinking}
                />
              </div>
            </div>

            {/* Extended Thinking Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nodeData.extendedThinking || false}
                onChange={(e) => handleDataChange('extendedThinking', e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-xs font-medium text-gray-600">
                Extended Thinking Mode (uses thinking budget)
              </label>
            </div>

            {/* Agent Mode Toggle (if tools enabled) */}
            {nodeData.toolsEnabled && (
              <div className="flex items-center gap-2 p-2 bg-teal-50 rounded border border-teal-200">
                <input
                  type="checkbox"
                  checked={nodeData.agentMode || false}
                  onChange={(e) => handleDataChange('agentMode', e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-xs font-medium text-gray-700 flex-1">
                  Agent Mode (multi-step tool reasoning)
                </label>
                {nodeData.agentMode && (
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Max steps:</label>
                    <input
                      type="number"
                      value={nodeData.maxSteps || 5}
                      onChange={(e) => handleDataChange('maxSteps', parseInt(e.target.value))}
                      min="1"
                      max="20"
                      className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5"
                    />
                  </div>
                )}
              </div>
            )}

            {/* System Prompt */}
            <VariableTextarea
              label="System Prompt"
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
              <div className="border border-purple-200 rounded p-3 bg-purple-50/50">
                <div className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1">
                  <span>📊</span>
                  <span>Structured Output</span>
                  <span className="text-purple-600 font-normal">(optional)</span>
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
                          className="text-xs px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors flex items-center gap-1"
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
                          className="text-xs px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors flex items-center gap-1"
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
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold">💡 Output:</span>
                <span>Reference using</span>
                <span className="font-mono text-purple-700">{'{{'}</span>
                <input
                  type="text"
                  value={nodeData.outputVariable || id}
                  onChange={(e) => handleDataChange('outputVariable', e.target.value)}
                  className="bg-white px-1 py-0.5 rounded font-mono text-purple-700 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 hover:border-purple-300 transition-colors min-w-[4ch]"
                  placeholder={id}
                  title="Click to edit output variable name"
                  style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
                />
                <span className="font-mono text-purple-700">{'}}'}</span>
              </div>

              {/* Show field-specific variables for JSON output */}
              {nodeData.outputFormat === 'json' && (
                <div className="mt-2 pl-4 border-l-2 border-purple-300">
                  <div className="text-purple-700 font-semibold mb-1">Individual fields available as:</div>
                  <div className="font-mono text-xs text-purple-600 space-y-0.5">
                    <div>{`{{${nodeData.outputVariable || id}.fieldName}}`}</div>
                    <div className="text-gray-500 italic">Example: {`{{${nodeData.outputVariable || id}.name}}`}, {`{{${nodeData.outputVariable || id}.score}}`}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Info */}
            <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
              {nodeData.model === 'claude-opus-4-5-20251101' && '🧠 Opus 4.5: Most intelligent | $5/$25 per 1M | 200K context | Effort parameter'}
              {nodeData.model === 'claude-sonnet-4-5-20250929' && '⚡ Sonnet 4.5: Best coding | $3/$15 per 1M | 200K context'}
              {nodeData.model === 'claude-haiku-4-5-20251001' && '💨 Haiku 4.5: Fastest | $1/$5 per 1M | 200K context'}
              {nodeData.model?.startsWith('claude-opus-4-1') && '🧠 Opus 4.1: $15/$75 per 1M | 200K context'}
              {nodeData.model?.startsWith('claude-opus-4-2') && '🧠 Opus 4: $15/$75 per 1M | 200K context'}
              {nodeData.model?.startsWith('claude-sonnet-4-2') && '⚡ Sonnet 4: $3/$15 per 1M | 200K context'}
              {nodeData.model?.startsWith('claude-sonnet-3-7') && '⚡ Sonnet 3.7: $3/$15 per 1M | 200K context'}
              {nodeData.model?.startsWith('claude-sonnet-3-5') && '⚡ Sonnet 3.5: $3/$15 per 1M | 200K context (Legacy)'}
              {nodeData.model?.startsWith('claude-3-opus') && '🧠 Opus 3: $15/$75 per 1M | 200K context (Legacy)'}
              {nodeData.model?.startsWith('claude-3-haiku') && '💨 Haiku 3: $0.25/$1.25 per 1M | 200K context (Legacy)'}
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

AnthropicNode.displayName = 'AnthropicNode';

export default AnthropicNode;
