import type { FC } from 'react';
import type { Tool, ToolExecutionStep } from '../../types/tools';
import { ToolStatusBadge } from './ToolStatusBadge';

export interface ToolStatusPanelProps {
  tools: Tool[];
  executionSteps?: ToolExecutionStep[];
  onToggleCollapse?: () => void;
}

export const ToolStatusPanel: FC<ToolStatusPanelProps> = ({
  tools,
  executionSteps = [],
  onToggleCollapse,
}) => {
  // Determine execution status for each tool
  const getToolExecutionStatus = (toolId: string) => {
    const toolSteps = executionSteps.filter(step => step.toolId === toolId);
    if (toolSteps.length === 0) return 'idle';

    const latestStep = toolSteps[toolSteps.length - 1];
    if (latestStep.status === 'executing') return 'executing';
    if (latestStep.status === 'success') return 'success';
    if (latestStep.status === 'error') return 'error';
    return 'idle';
  };

  const totalCalls = executionSteps.length;
  const totalDuration = executionSteps.reduce((sum, step) => sum + (step.duration || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tools.map(tool => (
            <ToolStatusBadge
              key={tool.id}
              tool={tool}
              executionStatus={getToolExecutionStatus(tool.id) as any}
              showDetails={true}
            />
          ))}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-xs px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors"
            title="Collapse status panel"
          >
            ▲
          </button>
        )}
      </div>

      {executionSteps.length > 0 && (
        <div className="text-xs text-gray-600">
          Last execution: {totalCalls} tool call{totalCalls !== 1 ? 's' : ''},{' '}
          {(totalDuration / 1000).toFixed(1)}s total
        </div>
      )}
    </div>
  );
};
