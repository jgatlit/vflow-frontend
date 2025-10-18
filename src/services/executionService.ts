import type { Node, Edge } from '@xyflow/react';
import { topologicalSort, substituteVariables, type ExecutionContext, type ExecutionResult } from '../utils/executionEngine';
import { executePython, executeJavaScript } from './codeExecutionService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Execution failed');
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      nodeId: request.nodeId,
      output: data.result.text,
      executedAt: new Date().toISOString(),
      metadata: {
        model: data.result.model,
        tokensUsed: data.result.usage?.totalTokens,
        duration,
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
      throw new Error('Streaming failed');
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
      node.data.content || '',
      augmentedContext
    );

    return {
      nodeId: node.id,
      output: processedContent,
      executedAt: new Date().toISOString(),
      metadata: {
        mode: 'processing',
        originalLength: node.data.content?.length || 0,
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
 * Execute entire flow
 */
export async function executeFlow(
  nodes: Node[],
  edges: Edge[],
  initialVariables: Record<string, string> = {}
): Promise<Map<string, ExecutionResult>> {
  const context: ExecutionContext = {
    variables: initialVariables,
    results: new Map(),
  };

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
        node.data.code || '',
        context,
        node.id,
        node.data.outputVariable || 'result'
      );
    } else if (node.type === 'javascript') {
      result = await executeJavaScript(
        node.data.code || '',
        context,
        node.id,
        node.data.outputVariable || 'result'
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

    // Store result by output variable name for code nodes
    if ((node.type === 'python' || node.type === 'javascript') && node.data.outputVariable) {
      context.variables[node.data.outputVariable] = result.output;
    }

    // If there was an error, stop execution
    if (result.error) {
      console.warn(`⚠️ Stopping execution due to error in node ${node.id}`);
      break;
    }
  }

  console.log('🏁 Execution complete. Results:', context.results.size, 'nodes executed');
  return context.results;
}
