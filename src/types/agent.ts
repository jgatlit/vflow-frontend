/**
 * Agent execution types for multi-step reasoning visualization
 */

export interface ToolCall {
  toolId: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  error?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AgentStep {
  stepNumber: number;
  stepType: 'tool-call' | 'reasoning' | 'final-answer';
  toolCalls?: ToolCall[];
  reasoning?: string;
  output?: string;
  tokenUsage?: TokenUsage;
  duration: number; // milliseconds
  timestamp: string;
}

export interface AgentExecutionState {
  executionId: string;
  isExecuting: boolean;
  currentStep: number;
  maxSteps: number;
  steps: AgentStep[];
  finalResult?: string;
  error?: string;
}
