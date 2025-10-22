import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStep } from '../../types/agent';
import { StepCard } from './StepCard';

export interface AgentStepVisualizationProps {
  steps: AgentStep[];
  currentStep: number;
  maxSteps: number;
  isExecuting?: boolean;
}

export const AgentStepVisualization: FC<AgentStepVisualizationProps> = ({
  steps,
  currentStep,
  maxSteps,
  isExecuting = false,
}) => {
  const progress = Math.min((currentStep / maxSteps) * 100, 100);

  return (
    <div className="agent-steps-container">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Step {currentStep} of {maxSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-teal-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <motion.div
              key={step.stepNumber}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.3,
                type: 'spring',
                stiffness: 300,
                damping: 25,
              }}
              className={`p-3 rounded-lg border-2 ${
                index === steps.length - 1 && isExecuting
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <StepCard
                step={step}
                isActive={index === steps.length - 1 && isExecuting}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Current step indicator (thinking) */}
        {isExecuting && currentStep <= maxSteps && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-lg border-2 border-amber-400 bg-amber-50"
          >
            <div className="flex items-center gap-2">
              <div
                className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full"
                role="status"
                aria-label="Processing"
              />
              <span className="text-sm text-amber-700 font-medium">
                Agent is thinking...
              </span>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {steps.length === 0 && !isExecuting && (
          <div className="text-center text-sm text-gray-500 py-8">
            No execution steps yet. Run the workflow to see agent reasoning.
          </div>
        )}
      </div>
    </div>
  );
};
