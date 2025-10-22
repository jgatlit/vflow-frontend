import type { Node, Edge } from '@xyflow/react';
import { topologicalSort, substituteVariables, type ExecutionContext, type ExecutionResult } from '../utils/executionEngine';
import { executePython, executeJavaScript } from './codeExecutionService';
import { WebhookService } from './webhookService';
import type { WebhookOutNodeData } from '../types/webhook';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Map frontend tool IDs (snake_case) to backend tool IDs (camelCase)
 * Frontend uses snake_case for consistency with UI naming conventions
 * Backend uses camelCase to match TypeScript/JavaScript conventions
 */
const TOOL_ID_MAP: Record<string, string> = {
  'web_search': 'webSearch',
  'calculator': 'calculator',
  'code_interpreter': 'codeInterpreter',
  'file_read': 'fileRead',
  'file_write': 'fileWrite',
  'database_query': 'databaseQuery',
  'http_request': 'httpRequest',
  'email_sender': 'emailSender',
};

/**
 * Convert frontend tool IDs to backend tool IDs
 */
function mapToolIds(frontendToolIds?: string[]): string[] | undefined {
  if (!frontendToolIds || frontendToolIds.length === 0) {
    return undefined;
  }
  return frontendToolIds.map(id => TOOL_ID_MAP[id] || id);
}

export interface NodeExecutionRequest {
  nodeId: string;
  nodeType: string;
  data: any;
  context: ExecutionContext;
}

/**
 * Execute a single LLM node
 */
export async function executeNode(request: NodeExecutionRequest): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Determine provider based on node type
    let provider: 'openai' | 'anthropic' | 'gemini';
    switch (request.nodeType) {
      case 'openai':
        provider = 'openai';
        break;
      case 'anthropic':
        provider = 'anthropic';
        break;
      case 'gemini':
        provider = 'gemini';
        break;
      default:
        throw new Error(`Unsupported node type: ${request.nodeType}`);
    }

    // Substitute variables in prompts
    const systemPrompt = request.data.systemPrompt
      ? substituteVariables(request.data.systemPrompt, request.context)
      : undefined;
    const userPrompt = substituteVariables(request.data.userPrompt, request.context);

    // Make API request
    const response = await fetch(`${API_URL}/api/execute/node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        model: request.data.model,
        systemPrompt,
        userPrompt,
        temperature: request.data.temperature,
        maxTokens: request.data.maxTokens,
        extendedThinking: request.data.extendedThinking,
        thinkingBudget: request.data.thinkingBudget,
        multimodal: request.data.multimodal, // Enable Google SDK for images, videos, PDFs
        outputFormat: request.data.outputFormat,
        jsonSchema: request.data.jsonSchema,
        csvFields: request.data.csvFields,
        enabledTools: mapToolIds(request.data.enabledTools), // Convert snake_case to camelCase for backend
        maxToolRounds: request.data.maxToolRounds || 5, // Maximum tool calling rounds
      }),
    });

    if (!response.ok) {
      // Try to parse error response as JSON, fallback to text
      let errorMessage = 'Execution failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        // Fallback to status text if parsing fails
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Parse response body with better error handling
    let data: any;
    const duration = Date.now() - startTime;

    try {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}\n${text.substring(0, 200)}`);
      }
      data = await response.json();
    } catch (parseError: any) {
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }

    return {
      nodeId: request.nodeId,
      output: data.result.text,
      executedAt: new Date().toISOString(),
      traceId: data.result.traceId,  // Include trace ID from backend
      metadata: {
        model: data.result.model,
        tokensUsed: data.result.usage?.totalTokens,
        duration,
        structuredData: data.result.structuredData,  // Include structured data
      },
    };
  } catch (error: any) {
    return {
      nodeId: request.nodeId,
      output: '',
      error: error.message,
      executedAt: new Date().toISOString(),
    };
  }
}

/**
 * Execute a single node with streaming
 */
export async function* executeNodeStream(
  request: NodeExecutionRequest
): AsyncGenerator<string, ExecutionResult, unknown> {
  const startTime = Date.now();

  try {
    let provider: 'openai' | 'anthropic' | 'gemini';
    switch (request.nodeType) {
      case 'openai':
        provider = 'openai';
        break;
      case 'anthropic':
        provider = 'anthropic';
        break;
      case 'gemini':
        provider = 'gemini';
        break;
      default:
        throw new Error(`Unsupported node type: ${request.nodeType}`);
    }

    const systemPrompt = request.data.systemPrompt
      ? substituteVariables(request.data.systemPrompt, request.context)
      : undefined;
    const userPrompt = substituteVariables(request.data.userPrompt, request.context);

    const response = await fetch(`${API_URL}/api/execute/node-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        model: request.data.model,
        systemPrompt,
        userPrompt,
        temperature: request.data.temperature,
        maxTokens: request.data.maxTokens,
      }),
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Streaming failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text || response.statusText || errorMessage;
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullOutput = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullOutput += data.chunk;
              yield data.chunk;
            }
            if (data.done) {
              const duration = Date.now() - startTime;
              return {
                nodeId: request.nodeId,
                output: fullOutput,
                executedAt: new Date().toISOString(),
                metadata: { duration },
              };
            }
            if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      nodeId: request.nodeId,
      output: fullOutput,
      executedAt: new Date().toISOString(),
      metadata: { duration },
    };
  } catch (error: any) {
    return {
      nodeId: request.nodeId,
      output: '',
      error: error.message,
      executedAt: new Date().toISOString(),
    };
  }
}

/**
 * Passthrough mode for notes nodes (VAR OFF)
 * Forwards input to output unchanged
 */
async function passthroughNotesNode(
  node: Node,
  context: ExecutionContext,
  edges: Edge[]
): Promise<ExecutionResult> {
  // Find incoming edge
  const incomingEdge = edges.find(e => e.target === node.id);

  if (!incomingEdge) {
    // No input connection, output empty
    return {
      nodeId: node.id,
      output: '',
      executedAt: new Date().toISOString(),
      metadata: {
        mode: 'passthrough',
        hasInput: false,
      },
    };
  }

  // Get input from previous node
  const inputResult = context.results.get(incomingEdge.source);

  return {
    nodeId: node.id,
    output: inputResult?.output || '',  // Forward unchanged
    executedAt: new Date().toISOString(),
    metadata: {
      mode: 'passthrough',
      hasInput: true,
      inputNodeId: incomingEdge.source,
      inputLength: inputResult?.output?.length || 0,
    },
  };
}

/**
 * Processing mode for notes nodes (VAR ON)
 * Substitutes variables in markdown content
 */
async function executeNotesNode(
  node: Node,
  context: ExecutionContext,
  edges: Edge[]
): Promise<ExecutionResult> {
  try {
    // Build input variables from connections
    const incomingEdges = edges.filter(e => e.target === node.id);
    const inputVars: Record<string, string> = {};

    // Add numbered inputs {{1}}, {{2}}, etc.
    incomingEdges.forEach((edge, index) => {
      const inputResult = context.results.get(edge.source);
      if (inputResult) {
        inputVars[`${index + 1}`] = inputResult.output;
        // Also make available as node ID
        inputVars[edge.source] = inputResult.output;
      }
    });

    // Create augmented context
    const augmentedContext = {
      ...context,
      variables: { ...context.variables, ...inputVars },
    };

    // Substitute variables in content
    const processedContent = substituteVariables(
      (node.data as any).content || '',
      augmentedContext
    );

    return {
      nodeId: node.id,
      output: processedContent,
      executedAt: new Date().toISOString(),
      metadata: {
        mode: 'processing',
        originalLength: (node.data as any).content?.length || 0,
        processedLength: processedContent.length,
        inputCount: incomingEdges.length,
      },
    };
  } catch (error: any) {
    return {
      nodeId: node.id,
      output: '',
      error: error.message,
      executedAt: new Date().toISOString(),
    };
  }
}

/**
 * Execute entire flow with database tracking
 */
export async function executeFlow(
  nodes: Node[],
  edges: Edge[],
  initialVariables: Record<string, string> = {},
  options?: {
    flowId?: string;
    flowName?: string;
    flowVersion?: string;
    trackExecution?: boolean;
  }
): Promise<Map<string, ExecutionResult>> {
  const context: ExecutionContext = {
    variables: initialVariables,
    results: new Map(),
  };

  // Track execution if enabled and flow info provided
  let executionId: string | undefined;
  const startTime = Date.now();

  if (options?.trackExecution && options.flowId && options.flowName && options.flowVersion) {
    try {
      const { createExecutionWithMetadata } = await import('../db/database');
      const execution = await createExecutionWithMetadata(
        options.flowId,
        initialVariables,
        {
          name: options.flowName,
        }
      );
      executionId = execution.id;
      console.log('📝 Execution tracking started:', executionId);
    } catch (error) {
      console.warn('Failed to create execution record:', error);
      // Continue execution even if tracking fails
    }
  }

  // Get execution order
  const executionOrder = topologicalSort(nodes, edges);

  // Log execution order for debugging
  console.log('🚀 Execution Order:', executionOrder.map(n => `${n.id}(${n.type})`).join(' → '));
  console.log('📊 Total nodes to execute:', executionOrder.length);

  // Execute nodes in order
  for (const node of executionOrder) {
    console.log(`▶️ Executing node ${node.id} (${node.type})...`);
    let result: ExecutionResult;

    // Execute based on node type
    if (node.type === 'notes') {
      // Notes nodes are ALWAYS executed (not skipped)
      result = node.data.varMode
        ? await executeNotesNode(node, context, edges)      // Process variables
        : await passthroughNotesNode(node, context, edges); // Forward input
    } else if (node.type === 'python') {
      result = await executePython(
        (node.data as any).code || '',
        context,
        node.id,
        (node.data as any).outputVariable || 'result'
      );
    } else if (node.type === 'javascript') {
      result = await executeJavaScript(
        (node.data as any).code || '',
        context,
        node.id,
        (node.data as any).outputVariable || 'result'
      );
    } else if (node.type === 'webhook-in') {
      // Webhook inbound nodes are triggered externally
      // During normal flow execution, we skip them or use cached payload
      result = {
        nodeId: node.id,
        output: context.variables['webhook-payload'] || '{}',
        executedAt: new Date().toISOString(),
        metadata: {
          nodeType: 'webhook-in',
          outputVariable: (node.data as any).outputVariable || node.id,
        },
      };
    } else if (node.type === 'webhook-out') {
      // Execute outbound webhook
      result = await WebhookService.executeOutboundWebhook(
        node.data as WebhookOutNodeData,
        context,
        node.id
      );
    } else {
      // Execute LLM node
      result = await executeNode({
        nodeId: node.id,
        nodeType: node.type || 'openai',
        data: node.data,
        context,
      });
    }

    // Store result
    context.results.set(node.id, result);

    // Log result summary
    if (result.error) {
      console.error(`❌ Node ${node.id} failed:`, result.error);
    } else {
      console.log(`✅ Node ${node.id} completed - Output length: ${result.output.length} chars`);
    }

    // Store result by custom output variable name if provided
    const outputVarName = (node.data as any).outputVariable || node.id;
    context.variables[outputVarName] = result.output;

    // Also store by node ID for backward compatibility
    if (node.data.outputVariable && node.data.outputVariable !== node.id) {
      context.variables[node.id] = result.output;
    }

    // For structured output (JSON or CSV), extract individual fields as separate variables
    // Use metadata.structuredData if available (for CSV) or parse JSON output
    if ((node.data.outputFormat === 'json' || node.data.outputFormat === 'csv') && !result.error) {
      try {
        let jsonData: any = null;

        // First, try to use structured data from metadata (for CSV outputs)
        if (result.metadata?.structuredData) {
          jsonData = result.metadata.structuredData;
          console.log(`  📊 Using structured data from metadata`);
        }
        // Otherwise, parse JSON output directly
        else if (node.data.outputFormat === 'json' && result.output) {
          // Strip markdown code blocks if present
          let jsonString = result.output.trim();
          jsonString = jsonString.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').trim();
          jsonData = JSON.parse(jsonString);
        }

        if (jsonData) {
          // Helper function to convert value to string properly
          const valueToString = (value: any): string => {
            if (value === null || value === undefined) {
              return String(value);
            }
            if (typeof value === 'object') {
              return JSON.stringify(value, null, 2);
            }
            return String(value);
          };

          // If it's an object, store each field as nodeId.fieldName
          if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
            Object.keys(jsonData).forEach(key => {
              const varName = `${outputVarName}.${key}`;
              const stringValue = valueToString(jsonData[key]);
              context.variables[varName] = stringValue;
              console.log(`  📊 Created variable: {{${varName}}} = ${stringValue.substring(0, 50)}${stringValue.length > 50 ? '...' : ''}`);
            });
          }
          // If it's an array, store with indexes
          else if (Array.isArray(jsonData)) {
            jsonData.forEach((item, index) => {
              if (typeof item === 'object') {
                Object.keys(item).forEach(key => {
                  const varName = `${outputVarName}[${index}].${key}`;
                  const stringValue = valueToString(item[key]);
                  context.variables[varName] = stringValue;
                });
              } else {
                const varName = `${outputVarName}[${index}]`;
                context.variables[varName] = String(item);
              }
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse structured output for variable extraction:`, error);
        // Continue execution - the full output is still stored
      }
    }

    // If there was an error, stop execution
    if (result.error) {
      console.warn(`⚠️ Stopping execution due to error in node ${node.id}`);
      break;
    }
  }

  console.log('🏁 Execution complete. Results:', context.results.size, 'nodes executed');

  // Complete execution tracking if enabled
  if (executionId) {
    try {
      const { saveExecutionWithTrace } = await import('../db/database');
      const duration = Date.now() - startTime;
      const hasErrors = Array.from(context.results.values()).some(r => r.error);
      const results = Array.from(context.results.entries()).map(([nodeId, result]) => ({
        ...result,
        nodeId,
      }));

      await saveExecutionWithTrace(
        executionId,
        results,
        undefined, // traceId not available in this context
        {
          status: hasErrors ? 'failed' : 'completed',
          error: hasErrors ? 'One or more nodes failed' : undefined,
        }
      );

      console.log('✅ Execution tracking completed:', executionId, `(${duration}ms)`);
    } catch (error) {
      console.warn('Failed to complete execution record:', error);
      // Don't fail the execution if tracking fails
    }
  }

  return context.results;
}

/**
 * Execute entire flow with unified parent trace (backend orchestration)
 * This creates a single parent trace in LangSmith with all nodes as children
 */
export async function executeFlowWithTrace(
  nodes: Node[],
  edges: Edge[],
  initialVariables: Record<string, string> = {}
): Promise<{
  executionId: string;
  traceId?: string;
  results: Map<string, ExecutionResult>;
}> {
  try {
    const response = await fetch(`${API_URL}/api/execute/flow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          data: n.data,
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
        })),
        variables: initialVariables,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Flow execution failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Convert results object to Map
    const resultsMap = new Map<string, ExecutionResult>();
    if (data.results) {
      Object.entries(data.results).forEach(([nodeId, result]: [string, any]) => {
        resultsMap.set(nodeId, result);
      });
    }

    return {
      executionId: data.executionId,
      traceId: data.traceId,  // Parent trace ID for viewing all nodes
      results: resultsMap,
    };
  } catch (error: any) {
    throw new Error(`Flow execution failed: ${error.message}`);
  }
}

/**
 * Execute an agent node with multi-step reasoning
 * Note: This will be enhanced with WebSocket streaming when backend support is added
 */
export async function executeAgentNode(nodeData: any): Promise<ExecutionResult> {
  const startTime = Date.now();
  const executionId = nodeData.executionId || crypto.randomUUID();

  try {
    // Substitute variables in prompts
    const systemPrompt = nodeData.systemPrompt || '';
    const userPrompt = nodeData.userPrompt || '';

    // Make API request to agent endpoint
    // TODO: This endpoint will be implemented in the backend
    const response = await fetch(`${API_URL}/api/execute/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        executionId,
        provider: nodeData.provider || 'anthropic',
        model: nodeData.model || 'claude-sonnet-4-5-20250929',
        systemPrompt,
        userPrompt,
        temperature: nodeData.temperature || 0.7,
        maxTokens: nodeData.maxTokens || 4096,
        enabledTools: nodeData.enabledTools || [],
        toolConfigs: nodeData.toolConfigs || {},
        maxAgentSteps: nodeData.maxAgentSteps || 5,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Agent execution failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      nodeId: nodeData.nodeId || executionId,
      output: data.result?.finalAnswer || data.result?.text || '',
      executedAt: new Date().toISOString(),
      metadata: {
        model: data.result?.model,
        tokensUsed: data.result?.usage?.totalTokens,
        duration,
        steps: data.result?.steps || [],
        executionId,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      nodeId: nodeData.nodeId || executionId,
      output: '',
      error: error.message,
      executedAt: new Date().toISOString(),
      metadata: {
        duration,
        executionId,
      },
    };
  }
}

// ===== EXECUTION HISTORY API =====

export interface ExecutionHistoryItem {
  id: string;
  flowId: string;
  flowName: string;
  flowVersion: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results: ExecutionResult[];
  parentTraceId?: string;
  error?: string;
}

/**
 * Fetch execution history for a specific flow from backend
 *
 * @param flowId - The flow ID to fetch executions for
 * @param limit - Maximum number of executions to return (default: 10)
 * @returns Promise resolving to array of execution history items
 */
export async function fetchExecutionHistory(
  flowId: string,
  limit: number = 10
): Promise<ExecutionHistoryItem[]> {
  try {
    const response = await fetch(`${API_URL}/api/executions?flowId=${flowId}&limit=${limit}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch executions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.executions || [];
  } catch (error) {
    console.error('[ExecutionService] Failed to fetch execution history:', error);
    throw error;
  }
}

/**
 * Complete an execution in the backend (creates execution record if doesn't exist)
 *
 * @param executionId - The execution ID to complete
 * @param results - Execution results array
 * @param status - Final execution status
 * @param parentTraceId - Optional parent trace ID
 * @param error - Optional error message if failed
 * @param flowId - Flow ID (required for creating execution if doesn't exist)
 * @param flowName - Flow name (required for creating execution if doesn't exist)
 * @param flowVersion - Flow version (defaults to '1.0.0')
 */
export async function completeBackendExecution(
  executionId: string,
  results: ExecutionResult[],
  status: 'completed' | 'failed' | 'cancelled',
  parentTraceId?: string,
  error?: string,
  flowId?: string,
  flowName?: string,
  flowVersion: string = '1.0.0'
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/executions/${executionId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        results,
        parentTraceId,
        error,
        flowId,
        flowName,
        flowVersion,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to complete execution: ${response.statusText}`);
    }

    console.log(`[ExecutionService] Completed execution ${executionId} (status: ${status})`);
  } catch (error) {
    console.error('[ExecutionService] Failed to complete execution:', error);
    // Don't throw - execution completion to backend is best-effort
    // Local history still works even if backend save fails
  }
}

/**
 * Create a new execution record in the backend
 *
 * @param flowId - Flow ID being executed
 * @param flowName - Flow name
 * @param flowVersion - Flow version
 * @returns The created execution ID
 */
export async function createBackendExecution(
  flowId: string,
  flowName: string,
  flowVersion: string
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flowId,
        flowName,
        flowVersion,
        trigger: 'manual',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create execution: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ExecutionService] Created execution ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('[ExecutionService] Failed to create execution:', error);
    // Return a UUID if backend creation fails - local execution still works
    return crypto.randomUUID();
  }
}
