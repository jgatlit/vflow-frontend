import type { FC } from 'react';
import type { AgentStep } from '../../types/agent';

export interface StepCardProps {
  step: AgentStep;
  isActive: boolean;
}

const formatStepType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'tool-call': 'Tool Execution',
    'reasoning': 'Reasoning',
    'final-answer': 'Final Answer',
  };
  return typeMap[type] || type;
};

const StepTypeIcon: FC<{ type: string }> = ({ type }) => {
  const iconMap: Record<string, string> = {
    'tool-call': '🔧',
    'reasoning': '💭',
    'final-answer': '✅',
  };
  return <span className="text-base">{iconMap[type] || '❓'}</span>;
};

const formatArgs = (args: Record<string, any>): string => {
  const entries = Object.entries(args);
  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => {
      const strValue = typeof value === 'string'
        ? `"${value}"`
        : JSON.stringify(value);
      return `${key}: ${strValue.length > 30 ? strValue.slice(0, 30) + '...' : strValue}`;
    })
    .join(', ');
};

const formatResult = (result: any): string => {
  if (result === null || result === undefined) return 'null';
  if (typeof result === 'string') return result.length > 50 ? result.slice(0, 50) + '...' : result;
  const json = JSON.stringify(result);
  return json.length > 50 ? json.slice(0, 50) + '...' : json;
};

const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const StepCard: FC<StepCardProps> = ({ step, isActive }) => {
  return (
    <div className="space-y-2">
      {/* Step header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StepTypeIcon type={step.stepType} />
          <span className="text-sm font-medium">
            Step {step.stepNumber}: {formatStepType(step.stepType)}
          </span>
        </div>
        <span className="text-xs text-gray-500">{step.duration}ms</span>
      </div>

      {/* Tool calls */}
      {step.toolCalls && step.toolCalls.length > 0 && (
        <div className="space-y-1">
          {step.toolCalls.map((toolCall, idx) => (
            <div key={idx} className="text-xs bg-gray-100 rounded p-2">
              <div className="font-mono text-teal-700">
                {toolCall.toolName}
                {Object.keys(toolCall.args).length > 0 && (
                  <span className="text-gray-600">({formatArgs(toolCall.args)})</span>
                )}
              </div>
              {toolCall.result && (
                <div className="mt-1 text-gray-600">
                  → {formatResult(toolCall.result)}
                </div>
              )}
              {toolCall.error && (
                <div className="mt-1 text-red-600">
                  ✗ {truncate(toolCall.error, 100)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      {step.reasoning && (
        <div className="text-xs text-gray-700 italic bg-gray-50 rounded p-2">
          "{truncate(step.reasoning, 150)}"
        </div>
      )}

      {/* Output */}
      {step.output && (
        <div className="text-xs text-gray-700 bg-green-50 rounded p-2">
          <span className="font-medium text-green-800">Output: </span>
          {truncate(step.output, 100)}
        </div>
      )}

      {/* Token usage */}
      {step.tokenUsage && (
        <div className="text-xs text-gray-500 flex gap-3">
          <span>In: {step.tokenUsage.inputTokens}</span>
          <span>Out: {step.tokenUsage.outputTokens}</span>
          <span className="font-medium">Total: {step.tokenUsage.totalTokens}</span>
        </div>
      )}
    </div>
  );
};
