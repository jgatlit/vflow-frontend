import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToolExecutionStep } from '../../types/tools';

export interface ToolExecutionLogProps {
  steps: ToolExecutionStep[];
  currentStep?: number;
  autoScroll?: boolean;
}

export const ToolExecutionLog: FC<ToolExecutionLogProps> = ({
  steps,
  currentStep,
  autoScroll = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps, autoScroll]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="max-h-60 overflow-y-auto space-y-2"
    >
      <AnimatePresence>
        {steps.map((step) => {
          const isActive = currentStep === step.stepNumber;

          const borderColor = {
            pending: 'border-gray-300',
            executing: 'border-amber-500',
            success: 'border-green-500',
            error: 'border-red-500',
          }[step.status];

          const bgColor = {
            pending: 'bg-gray-50',
            executing: 'bg-amber-50',
            success: 'bg-green-50',
            error: 'bg-red-50',
          }[step.status];

          const statusIcon = {
            pending: '⚪',
            executing: '🟡',
            success: '🟢',
            error: '🔴',
          }[step.status];

          return (
            <motion.div
              key={step.stepNumber}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-3 rounded border-l-4 ${borderColor} ${bgColor} ${
                isActive ? 'ring-2 ring-teal-300' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg" aria-hidden="true">{statusIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      Step {step.stepNumber}
                    </span>
                    <span className="text-xs text-gray-500">
                      {step.toolName}
                    </span>
                    {step.duration && (
                      <span className="text-xs text-gray-400">
                        {step.duration}ms
                      </span>
                    )}
                  </div>

                  {step.input && (
                    <div className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Input:</span>
                      <div className="mt-1 p-2 bg-white/50 rounded font-mono text-xs break-all">
                        {typeof step.input === 'string'
                          ? step.input
                          : JSON.stringify(step.input, null, 2)}
                      </div>
                    </div>
                  )}

                  {step.output && (
                    <div className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Output:</span>
                      <div className="mt-1 p-2 bg-white/50 rounded font-mono text-xs break-all">
                        {typeof step.output === 'string'
                          ? step.output
                          : JSON.stringify(step.output, null, 2)}
                      </div>
                    </div>
                  )}

                  {step.error && (
                    <div className="mt-1 text-xs text-red-700">
                      <span className="font-medium">Error:</span>
                      <div className="mt-1 p-2 bg-red-100 rounded break-all">
                        {step.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
