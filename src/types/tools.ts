export interface Tool {
  id: string;
  name: string;
  displayName: string;
  icon: string; // Emoji or icon identifier
  description: string;
  category: 'search' | 'compute' | 'data' | 'integration' | 'custom';
  requiresConfig: boolean;
  configSchema?: Record<string, any>; // Zod schema for validation
  status: 'ready' | 'disabled' | 'error' | 'needsConfig';
  lastError?: string;
}

export interface ToolExecutionStep {
  stepNumber: number;
  toolId: string;
  toolName: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  duration?: number; // milliseconds
  input?: string;
  output?: string;
  error?: string;
  timestamp: string;
}
