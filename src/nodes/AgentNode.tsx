import { memo, useState, useMemo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolSelector } from '../components/tools/ToolSelector';
import { ToolCard } from '../components/tools/ToolCard';
import { ToolStatusPanel } from '../components/tools/ToolStatusPanel';
import { AgentStepVisualization } from '../components/agent/AgentStepVisualization';
import { useAgentExecution } from '../hooks/useAgentExecution';
import { AVAILABLE_TOOLS, KNOWLEDGE_TOOLS } from '../config/tools';
import type { Tool } from '../types/tools';
import type { AgentStep } from '../types/agent';
import type { ToolAugmentedLLMNodeData } from './ToolAugmentedLLMNode';

export interface AgentNodeData extends ToolAugmentedLLMNodeData {
  // Agent-specific fields
  agentMode: true; // Always true for agent nodes
  maxAgentSteps: number;

  // Execution state
  executionId?: string;
  agentSteps?: AgentStep[];
  agentCurrentStep?: number;

  // UI state
  stepsCollapsed?: boolean;
}

const AgentNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as AgentNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const [toolSelectorOpen, setToolSelectorOpen] = useState(false);
  const [configPanelTool, setConfigPanelTool] = useState<string | null>(null);

  // Generate execution ID if not present
  const executionId = useMemo(() => {
    if (nodeData.executionId) return nodeData.executionId;
    const newId = `agent-${id}-${Date.now()}`;
    updateNodeData(id, { executionId: newId });
    return newId;
  }, [nodeData.executionId, id, updateNodeData]);

  // WebSocket connection for real-time updates
  const { steps, isExecuting, addStep, startExecution, completeExecution } = useAgentExecution({
    executionId,
    onStepComplete: (step) => {
      updateNodeData(id, {
        agentSteps: [...(nodeData.agentSteps || []), step],
        agentCurrentStep: step.stepNumber,
      });
    },
    onComplete: (result) => {
      console.log('Agent execution completed:', result);
    },
    onError: (error) => {
      console.error('Agent execution error:', error);
    },
    enabled: nodeData.isExecuting || false,
  });

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

  // Calculate handle positions for enabled tools
  const handlePositions = useMemo(() => {
    const nodeHeight = 600;
    const reservedTop = nodeData.toolBarCollapsed ? 40 : 120;
    const reservedBottom = nodeData.stepsCollapsed ? 40 : 300;
    const availableHeight = nodeHeight - reservedTop - reservedBottom;

    return enabledTools.map((tool, index) => {
      const spacing = availableHeight / (enabledTools.length + 1);
      const position = reservedTop + (spacing * (index + 1));
      return { toolId: tool.id, position };
    });
  }, [enabledTools, nodeData.toolBarCollapsed, nodeData.stepsCollapsed]);

  const currentSteps = nodeData.agentSteps || steps || [];
  const currentStepNumber = nodeData.agentCurrentStep || currentSteps.length;

  return (
    <>
      <NodeResizer
        minWidth={nodeData.toolBarCollapsed ? 350 : 550}
        minHeight={nodeData.stepsCollapsed ? 450 : 650}
        maxWidth={900}
        maxHeight={1200}
        isVisible={selected}
      />

      <div className={`bg-white rounded-lg shadow-lg border-2 border-purple-500 ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
        {/* Header Badge */}
        <div className="bg-purple-500 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <input
                type="text"
                value={nodeData.title || 'Agent Node'}
                onChange={(e) => updateNodeData(id, { title: e.target.value })}
                className="font-semibold text-lg bg-transparent border-none focus:outline-none text-white placeholder-purple-200"
                placeholder="Agent Node"
              />
              <div className="text-xs text-purple-100">Multi-Step Reasoning Agent</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
              Agent Mode
            </span>
          </div>
        </div>

        {/* Tool Augmentation Bar */}
        <AnimatePresence>
          {!nodeData.toolBarCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-b border-purple-200 bg-purple-50 p-3 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-700">
                  🔧 Tools ({enabledTools.length}/{AVAILABLE_TOOLS.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setToolSelectorOpen(true)}
                    className="text-xs px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                  >
                    + Add Tool
                  </button>
                  <button
                    onClick={() => updateNodeData(id, { toolBarCollapsed: true })}
                    className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
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
                        executing={nodeData.isExecuting || false}
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
          <div className="border-b border-purple-200 bg-purple-50 p-2 flex items-center justify-between">
            <span className="text-xs text-purple-700">
              🔧 {enabledTools.length} tool{enabledTools.length !== 1 ? 's' : ''} enabled
            </span>
            <button
              onClick={() => updateNodeData(id, { toolBarCollapsed: false })}
              className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              title="Expand tool bar"
            >
              ▼
            </button>
          </div>
        )}

        {/* LLM Configuration */}
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

            {/* Temperature and Max Agent Steps */}
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
                  Max Reasoning Steps
                </label>
                <input
                  type="number"
                  value={nodeData.maxAgentSteps || 5}
                  onChange={(e) => updateNodeData(id, { maxAgentSteps: parseInt(e.target.value) })}
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
                placeholder="You are an autonomous agent with access to tools. Think step-by-step and use tools to accomplish your goal..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                User Prompt (Task)
              </label>
              <textarea
                value={nodeData.userPrompt || ''}
                onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-y min-h-[80px]"
                placeholder="{{input}}&#10;&#10;Analyze this data and provide insights..."
              />
            </div>
          </div>
        </div>

        {/* Agent Reasoning Visualization */}
        <AnimatePresence>
          {!nodeData.stepsCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-purple-200 p-3 bg-purple-50/30 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span>🧠</span>
                  <span>Agent Reasoning</span>
                </h4>
                <button
                  onClick={() => updateNodeData(id, { stepsCollapsed: true })}
                  className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                  title="Collapse steps"
                >
                  ▲
                </button>
              </div>
              <AgentStepVisualization
                steps={currentSteps}
                currentStep={currentStepNumber}
                maxSteps={nodeData.maxAgentSteps || 5}
                isExecuting={nodeData.isExecuting || false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Steps Indicator */}
        {nodeData.stepsCollapsed && (
          <div className="border-t border-purple-200 bg-purple-50 p-2 flex items-center justify-between">
            <span className="text-xs text-purple-700">
              🧠 {currentSteps.length} reasoning step{currentSteps.length !== 1 ? 's' : ''}
              {nodeData.isExecuting && ' (executing...)'}
            </span>
            <button
              onClick={() => updateNodeData(id, { stepsCollapsed: false })}
              className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              title="Expand steps"
            >
              ▼
            </button>
          </div>
        )}
      </div>

      {/* Standard Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
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
                className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
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

AgentNode.displayName = 'AgentNode';

export default AgentNode;
