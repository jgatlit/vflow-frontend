import type { FC } from 'react';
import type { Tool } from '../../types/tools';

export interface ToolStatusBadgeProps {
  tool: Tool;
  executionStatus?: 'idle' | 'executing' | 'success' | 'error';
  showDetails?: boolean;
  onClick?: () => void;
}

export const ToolStatusBadge: FC<ToolStatusBadgeProps> = ({
  tool,
  executionStatus = 'idle',
  showDetails = false,
  onClick,
}) => {
  const statusIcon = {
    idle: '○',
    executing: '◉',
    success: '✓',
    error: '✗',
  }[executionStatus];

  const statusColor = {
    idle: 'bg-gray-300',
    executing: 'bg-amber-500 animate-pulse',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }[executionStatus];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      onClick={onClick}
      role="status"
      aria-label={`Tool ${tool.displayName}: ${executionStatus}`}
    >
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span className="text-gray-700">{tool.displayName}</span>
      {showDetails && (
        <span className="text-gray-500">{statusIcon}</span>
      )}
    </div>
  );
};
