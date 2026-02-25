import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import VariableTextarea from '../components/VariableTextarea';
import { supportsStructuredOutput } from '../config/modelCapabilities';
import { csvFieldsToJsonSchema, jsonSchemaToCSVFields, jsonSchemaToMarkdown, csvFieldsToMarkdown } from '../utils/formatConversion';

export interface PerplexityNodeData {
  title?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;

  // Search Focus Mode (Core Feature)
  searchFocus: 'web' | 'academic' | 'social' | 'finance';

  // Search Configuration
  searchContextSize: 'low' | 'medium' | 'high';
  returnCitations: boolean;
  searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year';

  // Domain Filtering
  searchDomainFilter?: string;  // comma-separated domains

  // Standard fields
  outputFormat?: 'text' | 'json' | 'csv';
  jsonSchema?: string;
  csvFields?: string;
  outputVariable?: string;
  compactMode?: boolean;
  bypassed?: boolean;
}

const PerplexityNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PerplexityNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const previousOutputFormatRef = useRef<string | undefined>(nodeData.outputFormat);
  const [copied, setCopied] = useState(false);

  const handleDataChange = (field: keyof PerplexityNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
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
      <div className={`bg-white rounded-lg shadow-lg border-2 border-teal-500 p-4 ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🔍</span>
            <input
              type="text"
              value={nodeData.title || 'Perplexity Node'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-teal-300 rounded px-1"
              placeholder="Node Title"
            />
            <button
              onClick={() => handleDataChange('bypassed', !nodeData.bypassed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                nodeData.bypassed
                  ? 'bg-gray-400 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
              title={nodeData.bypassed ? 'Node is bypassed - click to activate' : 'Node is active - click to bypass'}
            >
              {nodeData.bypassed ? '⏸ Bypassed' : '▶ Active'}
            </button>
            <button
              onClick={() => handleDataChange('compactMode', !nodeData.compactMode)}
              className="text-xs px-2 py-1 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
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
            <div className="flex items-center gap-2">
              <span className="font-medium">Search Focus:</span>
              <span className="capitalize">{nodeData.searchFocus}</span>
              <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                {nodeData.searchContextSize} context
              </span>
            </div>
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
                  value={nodeData.model || 'sonar'}
                  onChange={(e) => handleDataChange('model', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <optgroup label="Sonar Series">
                    <option value="sonar">Sonar</option>
                    <option value="sonar-pro">Sonar Pro</option>
                  </optgroup>
                  <optgroup label="Reasoning Series">
                    <option value="sonar-reasoning">Sonar Reasoning</option>
                    <option value="sonar-reasoning-pro">Sonar Reasoning Pro</option>
                  </optgroup>
                  <optgroup label="Deep Research">
                    <option value="sonar-deep-research">Sonar Deep Research</option>
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

            {/* Search Focus Mode */}
            <div className="border border-teal-200 rounded p-3 bg-teal-50/50">
              <div className="text-xs font-semibold text-teal-800 mb-2 flex items-center gap-1">
                <span>🔍</span>
                <span>Search Focus Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 border border-teal-200 rounded bg-white hover:bg-teal-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`${id}-search-focus`}
                    value="web"
                    checked={nodeData.searchFocus === 'web'}
                    onChange={(e) => handleDataChange('searchFocus', e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Web</div>
                    <div className="text-xs text-gray-500">General web search</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 border border-teal-200 rounded bg-white hover:bg-teal-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`${id}-search-focus`}
                    value="academic"
                    checked={nodeData.searchFocus === 'academic'}
                    onChange={(e) => handleDataChange('searchFocus', e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Academic</div>
                    <div className="text-xs text-gray-500">Scholarly papers</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 border border-teal-200 rounded bg-white hover:bg-teal-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`${id}-search-focus`}
                    value="social"
                    checked={nodeData.searchFocus === 'social'}
                    onChange={(e) => handleDataChange('searchFocus', e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Social</div>
                    <div className="text-xs text-gray-500">Reddit, X, forums</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 border border-teal-200 rounded bg-white hover:bg-teal-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`${id}-search-focus`}
                    value="finance"
                    checked={nodeData.searchFocus === 'finance'}
                    onChange={(e) => handleDataChange('searchFocus', e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Finance</div>
                    <div className="text-xs text-gray-500">SEC filings</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Search Options */}
            <div className="border border-teal-200 rounded p-3 bg-teal-50/50">
              <div className="text-xs font-semibold text-teal-800 mb-2 flex items-center gap-1">
                <span>⚙️</span>
                <span>Search Options</span>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Context Size
                    </label>
                    <select
                      value={nodeData.searchContextSize || 'medium'}
                      onChange={(e) => handleDataChange('searchContextSize', e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="low">Low (faster, cheaper)</option>
                      <option value="medium">Medium (balanced)</option>
                      <option value="high">High (comprehensive)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Recency Filter
                    </label>
                    <select
                      value={nodeData.searchRecencyFilter || ''}
                      onChange={(e) => handleDataChange('searchRecencyFilter', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="">Any time</option>
                      <option value="hour">Past hour</option>
                      <option value="day">Past day</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={nodeData.returnCitations !== false}
                    onChange={(e) => handleDataChange('returnCitations', e.target.checked)}
                    className="w-4 h-4"
                    id={`${id}-citations`}
                  />
                  <label htmlFor={`${id}-citations`} className="text-xs font-medium text-gray-600">
                    Return Citations (source attribution)
                  </label>
                </div>
              </div>
            </div>

            {/* Domain Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Domain Filter (comma-separated, max 10)
              </label>
              <input
                type="text"
                value={nodeData.searchDomainFilter || ''}
                onChange={(e) => handleDataChange('searchDomainFilter', e.target.value)}
                className="w-full text-sm font-mono border border-gray-300 rounded px-2 py-1"
                placeholder="arxiv.org, nature.com, -pinterest.com"
              />
              <div className="text-xs text-gray-500 mt-1">
                Prefix with "-" to exclude domains. Leave empty for no filtering.
              </div>
            </div>

            {/* System Prompt */}
            <VariableTextarea
              label="System Instruction"
              value={nodeData.systemPrompt || ''}
              onChange={(value) => handleDataChange('systemPrompt', value)}
              placeholder="You are a helpful AI assistant with real-time search capabilities..."
              minHeight="60px"
            />

            {/* User Prompt */}
            <VariableTextarea
              label="User Prompt"
              value={nodeData.userPrompt || ''}
              onChange={(value) => handleDataChange('userPrompt', value)}
              placeholder="{{input}}&#10;&#10;Research and analyze..."
              minHeight="100px"
            />

            {/* Structured Output - Only for supported models */}
            {supportsStructuredOutput(nodeData.model) && (
              <div className="border border-teal-200 rounded p-3 bg-teal-50/50">
                <div className="text-xs font-semibold text-teal-800 mb-2 flex items-center gap-1">
                  <span>📊</span>
                  <span>Structured Output</span>
                  <span className="text-teal-600 font-normal">(optional)</span>
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
                          className="text-xs px-2 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors flex items-center gap-1"
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
                          className="text-xs px-2 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors flex items-center gap-1"
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
                      placeholder="topic, source, date, summary"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Output will be converted from JSON to CSV format
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Output Reference Help */}
            <div className="mt-3 p-2 bg-teal-50 rounded text-xs text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold">💡 Output:</span>
                <span>Reference using</span>
                <span className="font-mono text-teal-700">{'{{'}</span>
                <input
                  type="text"
                  value={nodeData.outputVariable || id}
                  onChange={(e) => handleDataChange('outputVariable', e.target.value)}
                  className="bg-white px-1 py-0.5 rounded font-mono text-teal-700 border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400 hover:border-teal-300 transition-colors min-w-[4ch]"
                  placeholder={id}
                  title="Click to edit output variable name"
                  style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
                />
                <span className="font-mono text-teal-700">{'}}'}</span>
              </div>

              {/* Show field-specific variables for JSON output */}
              {nodeData.outputFormat === 'json' && (
                <div className="mt-2 pl-4 border-l-2 border-teal-300">
                  <div className="text-teal-700 font-semibold mb-1">Individual fields available as:</div>
                  <div className="font-mono text-xs text-teal-600 space-y-0.5">
                    <div>{`{{${nodeData.outputVariable || id}.fieldName}}`}</div>
                    <div className="text-gray-500 italic">Example: {`{{${nodeData.outputVariable || id}.topic}}`}, {`{{${nodeData.outputVariable || id}.summary}}`}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Info */}
            <div className="mt-2 text-xs text-teal-600 bg-teal-50 rounded px-2 py-1">
              {nodeData.model === 'sonar' && '⚡ Sonar: $1/$1 per 1M | Quick facts, news, simple Q&A'}
              {nodeData.model === 'sonar-pro' && '🔍 Sonar Pro: $3/$15 per 1M | Complex queries, competitive analysis | 200K context'}
              {nodeData.model === 'sonar-reasoning' && '🧠 Sonar Reasoning: $1/$5 per 1M | Logic puzzles, math problems'}
              {nodeData.model === 'sonar-reasoning-pro' && '🎯 Sonar Reasoning Pro: $2/$8 per 1M | Complex problem-solving, research'}
              {nodeData.model === 'sonar-deep-research' && '🔬 Sonar Deep Research: $2/$8 per 1M + search fees | Academic research, deep analysis'}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-teal-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-teal-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
});

PerplexityNode.displayName = 'PerplexityNode';

export default PerplexityNode;
