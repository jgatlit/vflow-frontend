import { useEffect, useState, useRef } from 'react';
import type { AgentStep } from '../types/agent';

export interface UseAgentExecutionOptions {
  executionId: string;
  onStepComplete?: (step: AgentStep) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * WebSocket hook for real-time agent execution updates
 *
 * Note: This is a placeholder for WebSocket functionality.
 * In production, this would connect to Socket.io server.
 * For now, it provides the interface and state management structure.
 */
export function useAgentExecution({
  executionId,
  onStepComplete,
  onComplete,
  onError,
  enabled = true,
}: UseAgentExecutionOptions) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !executionId) {
      return;
    }

    // TODO: Replace with Socket.io when backend WebSocket is implemented
    // const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

    // For now, we'll use a placeholder that allows the UI to be ready
    console.log(`[AgentExecution] Ready for execution: ${executionId}`);
    setIsConnected(true);

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
    };
  }, [executionId, enabled]);

  // Method to manually add steps (for testing or non-WebSocket scenarios)
  const addStep = (step: AgentStep) => {
    setSteps(prev => [...prev, step]);
    onStepComplete?.(step);
  };

  // Method to start execution
  const startExecution = () => {
    setIsExecuting(true);
    setSteps([]);
  };

  // Method to complete execution
  const completeExecution = (result: any) => {
    setIsExecuting(false);
    onComplete?.(result);
  };

  // Method to handle errors
  const handleError = (error: Error) => {
    setIsExecuting(false);
    onError?.(error);
  };

  return {
    steps,
    isExecuting,
    isConnected,
    setIsExecuting,
    addStep,
    startExecution,
    completeExecution,
    handleError,
  };
}
