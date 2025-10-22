import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { Tool } from '../../types/tools';

export interface ToolCardProps {
  tool: Tool;
  enabled: boolean;
  executing?: boolean;
  onToggle: () => void;
  onConfigure?: () => void;
  compact?: boolean;
}

export const ToolCard: FC<ToolCardProps> = ({
  tool,
  enabled,
  executing = false,
  onToggle,
  onConfigure,
  compact = false,
}) => {
  const statusColor = {
    ready: 'bg-green-500',
    executing: 'bg-amber-500 animate-pulse',
    disabled: 'bg-gray-300',
    error: 'bg-red-500',
    needsConfig: 'bg-yellow-500',
  }[executing ? 'executing' : tool.status];

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        borderColor: enabled ? 'rgb(20 184 166)' : 'rgb(209 213 219)',
        backgroundColor: enabled ? 'rgb(240 253 250)' : 'rgb(255 255 255)',
      }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative border-2 rounded-lg p-2 cursor-pointer transition-all
        ${enabled ? 'border-teal-500 bg-teal-50' : 'border-gray-300 bg-white'}
      `}
      onClick={onToggle}
    >
      {/* Status Indicator */}
      <div className="absolute top-1 right-1">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      </div>

      {/* Tool Icon and Name */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl" aria-hidden="true">{tool.icon}</span>
        <span className="text-xs font-medium text-gray-700 text-center truncate w-full">
          {tool.displayName}
        </span>
      </div>

      {/* Configure Button (if tool requires config) */}
      {!compact && tool.requiresConfig && onConfigure && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfigure();
          }}
          className="mt-2 w-full text-xs px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded transition-colors"
        >
          ⚙ Configure
        </button>
      )}

      {/* Executing Indicator */}
      {executing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-amber-500/10 rounded-lg flex items-center justify-center"
        >
          <div className="text-xs font-semibold text-amber-700">Running...</div>
        </motion.div>
      )}
    </motion.div>
  );
};
