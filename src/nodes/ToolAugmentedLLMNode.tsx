/**
 * DEPRECATED: ToolAugmentedLLMNode
 *
 * This node has been deprecated in favor of enhanced provider-specific nodes
 * (AnthropicNode, OpenAINode, GeminiNode) which now support tools natively.
 *
 * Migration Guide:
 * - Use AnthropicNode, OpenAINode, or GeminiNode instead
 * - Click "🔧 Add Tools" button in the header to enable tools
 * - Enable "Agent Mode" for multi-step reasoning
 *
 * This component is kept for backward compatibility with existing flows.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolSelector } from '../components/tools/ToolSelector';
import { ToolCard } from '../components/tools/ToolCard';
import { ToolStatusPanel } from '../components/tools/ToolStatusPanel';
import { ToolExecutionLog } from '../components/tools/ToolExecutionLog';
import { AVAILABLE_TOOLS, KNOWLEDGE_TOOLS } from '../config/tools';
import type { Tool, ToolExecutionStep } from '../types/tools';
import type { AnthropicNodeData } from './AnthropicNode';

export interface ToolAugmentedLLMNodeData extends AnthropicNodeData {
  // Tool augmentation fields
  provider: 'anthropic' | 'openai' | 'gemini';
  toolsEnabled: boolean;
  enabledTools: string[];
  toolConfigs?: Record<string, any>;
  maxToolCalls?: number;

  // Agent mode (Phase 2)
  agentMode?: boolean;
  maxAgentSteps?: number;

  // Execution state
  isExecuting?: boolean;
  executionSteps?: ToolExecutionStep[];
  currentStep?: number;

  // UI state
  toolBarCollapsed?: boolean;
  statusPanelCollapsed?: boolean;
}

const ToolAugmentedLLMNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as ToolAugmentedLLMNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const [toolSelectorOpen, setToolSelectorOpen] = useState(false);
  const [configPanelTool, setConfigPanelTool] = useState<string | null>(null);

  // Get enabled tool objects
  const enabledTools = useMemo(() => {
    return (nodeData.enabledTools || [])
      .map(toolId => AVAILABLE_TOOLS.find(t => t.id === toolId))
      .filter(Boolean) as Tool[];
  }, [nodeData.enabledTools]);

  // Handle tool toggle
  const handleToolToggle = useCallback((toolId: string) => {
    const isEnabled = (nodeData.enabledTools || []).includes(toolId);
    const newEnabledTools = isEnabled
      ? (nodeData.enabledTools || []).filter(id => id !== toolId)
      : [...(nodeData.enabledTools || []), toolId];

    updateNodeData(id, { enabledTools: newEnabledTools });
  }, [id, nodeData.enabledTools, updateNodeData]);

  // Handle tool configuration
  const handleToolConfigure = useCallback((toolId: string, config: any) => {
    updateNodeData(id, {
      toolConfigs: {
        ...(nodeData.toolConfigs || {}),
        [toolId]: config,
      },
    });
  }, [id, nodeData.toolConfigs, updateNodeData]);

  // Calculate handle positions
  const handlePositions = useMemo(() => {
    const nodeHeight = 400; // TODO: Get from NodeResizer
    const reservedTop = nodeData.toolBarCollapsed ? 40 : 120;
    const reservedBottom = nodeData.statusPanelCollapsed ? 0 : 60;
    const availableHeight = nodeHeight - reservedTop - reservedBottom;

    return enabledTools.map((tool, index) => {
      const spacing = availableHeight / (enabledTools.length + 1);
      const position = reservedTop + (spacing * (index + 1));
      return { toolId: tool.id, position };
    });
  }, [enabledTools, nodeData.toolBarCollapsed, nodeData.statusPanelCollapsed]);

  return (
    <>
      <NodeResizer
        minWidth={nodeData.toolBarCollapsed ? 300 : 500}
        minHeight={nodeData.isExecuting ? 500 : 400}
        maxWidth={800}
        maxHeight={1000}
        isVisible={selected}
      />

      <div className={`bg-white rounded-lg shadow-lg border-2 border-teal-500 ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
        {/* Tool Augmentation Bar */}
        <AnimatePresence>
          {!nodeData.toolBarCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-b border-teal-200 bg-teal-50 p-3 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-teal-700">
                  🔧 Tools ({enabledTools.length}/{AVAILABLE_TOOLS.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateNodeData(id, { bypassed: !nodeData.bypassed })}
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
                    onClick={() => setToolSelectorOpen(true)}
                    className="text-xs px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors"
                  >
                    + Add Tool
                  </button>
                  <button
                    onClick={() => updateNodeData(id, { toolBarCollapsed: true })}
                    className="text-xs px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors"
                    title="Collapse tool bar"
                  >
                    ▲
                  </button>
                </div>
              </div>

              {/* Tool Cards Grid */}
              {enabledTools.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  <AnimatePresence>
                    {enabledTools.map(tool => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        enabled={true}
                        executing={nodeData.isExecuting &&
                                  nodeData.executionSteps?.some(s => s.toolId === tool.id && s.status === 'executing')}
                        onToggle={() => handleToolToggle(tool.id)}
                        onConfigure={() => setConfigPanelTool(tool.id)}
                        compact
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  No tools enabled. Click "+ Add Tool" to get started.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Tool Bar Indicator */}
        {nodeData.toolBarCollapsed && (
          <div className="border-b border-teal-200 bg-teal-50 p-2 flex items-center justify-between">
            <span className="text-xs text-teal-700">
              🔧 {enabledTools.length} tool{enabledTools.length !== 1 ? 's' : ''} enabled
            </span>
            <button
              onClick={() => updateNodeData(id, { toolBarCollapsed: false })}
              className="text-xs px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors"
              title="Expand tool bar"
            >
              ▼
            </button>
          </div>
        )}

        {/* LLM Core Container */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Provider and Model Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Provider
                </label>
                <select
                  value={nodeData.provider || 'anthropic'}
                  onChange={(e) => updateNodeData(id, { provider: e.target.value as any })}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="gemini">Google (Gemini)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={nodeData.model || 'claude-sonnet-4-5'}
                  onChange={(e) => updateNodeData(id, { model: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  placeholder="Model ID"
                />
              </div>
            </div>

            {/* Temperature and Max Tokens */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  value={nodeData.temperature || 0.7}
                  onChange={(e) => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Max Tool Calls
                </label>
                <input
                  type="number"
                  value={nodeData.maxToolCalls || 5}
                  onChange={(e) => updateNodeData(id, { maxToolCalls: parseInt(e.target.value) })}
                  min="1"
                  max="20"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
            </div>

            {/* Prompts */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                System Prompt
              </label>
              <textarea
                value={nodeData.systemPrompt || ''}
                onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-y min-h-[60px]"
                placeholder="You are a helpful assistant with access to tools..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                User Prompt
              </label>
              <textarea
                value={nodeData.userPrompt || ''}
                onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-y min-h-[100px]"
                placeholder="{{input}}&#10;&#10;Analyze this data..."
              />
            </div>
          </div>
        </div>

        {/* Execution Visualization (Agent Mode) */}
        <AnimatePresence>
          {nodeData.isExecuting && nodeData.executionSteps && nodeData.executionSteps.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-teal-200 p-3 bg-teal-50/50 overflow-hidden"
            >
              <div className="text-xs font-semibold text-teal-700 mb-2">
                Execution Progress (Step {nodeData.currentStep || 0}/{nodeData.maxToolCalls || 5})
              </div>
              <ToolExecutionLog
                steps={nodeData.executionSteps}
                currentStep={nodeData.currentStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tool Status Panel */}
        {!nodeData.statusPanelCollapsed && enabledTools.length > 0 && (
          <div className="border-t border-teal-200 bg-teal-50 p-2">
            <ToolStatusPanel
              tools={enabledTools}
              executionSteps={nodeData.executionSteps}
              onToggleCollapse={() => updateNodeData(id, { statusPanelCollapsed: true })}
            />
          </div>
        )}
      </div>

      {/* Standard Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-4 !h-4 !bg-teal-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-4 !h-4 !bg-teal-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />

      {/* Dynamic Tool Handles */}
      <AnimatePresence>
        {handlePositions.map(({ toolId, position }) => {
          const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
          const isKnowledgeTool = KNOWLEDGE_TOOLS.includes(toolId);

          return (
            <motion.div
              key={`handle-${toolId}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Handle
                type={isKnowledgeTool ? 'target' : 'source'}
                position={isKnowledgeTool ? Position.Left : Position.Right}
                id={`tool-${toolId}`}
                className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
                style={{
                  top: `${position}px`,
                  zIndex: 10,
                }}
                title={tool?.displayName || toolId}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Tool Selector Modal */}
      <AnimatePresence>
        {toolSelectorOpen && (
          <ToolSelector
            availableTools={AVAILABLE_TOOLS}
            selectedToolIds={nodeData.enabledTools || []}
            onToggle={handleToolToggle}
            onConfigure={(toolId) => {
              setConfigPanelTool(toolId);
              setToolSelectorOpen(false);
            }}
            onClose={() => setToolSelectorOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
});

ToolAugmentedLLMNode.displayName = 'ToolAugmentedLLMNode';

export default ToolAugmentedLLMNode;
