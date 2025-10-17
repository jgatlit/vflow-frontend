import { loadPyodide, type PyodideInterface } from 'pyodide';
import { substituteVariables, type ExecutionContext, type ExecutionResult } from '../utils/executionEngine';

// Cache Pyodide instance
let pyodideInstance: PyodideInterface | null = null;

/**
 * Load Pyodide (only once)
 */
async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodideInstance) {
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/',
    });
  }
  return pyodideInstance;
}

/**
 * Execute Python code
 */
export async function executePython(
  code: string,
  context: ExecutionContext,
  nodeId: string,
  outputVariable: string = 'result'
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const pyodide = await getPyodide();

    // Create context object for Python to access
    const contextForPython = {
      ...context.variables,
    };

    // Add results from previous nodes
    context.results.forEach((result, id) => {
      contextForPython[id] = result.output;
    });

    // Set up context in Python
    pyodide.globals.set('context', pyodide.toPy(contextForPython));

    // Execute code
    const result = await pyodide.runPythonAsync(code);

    // Get the result
    const output = result?.toString() || '';
    const duration = Date.now() - startTime;

    return {
      nodeId,
      output,
      executedAt: new Date().toISOString(),
      metadata: {
        runtime: 'pyodide',
        duration,
        outputVariable,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      nodeId,
      output: '',
      error: error.message || 'Python execution failed',
      executedAt: new Date().toISOString(),
      metadata: {
        runtime: 'pyodide',
        duration,
      },
    };
  }
}

/**
 * Execute JavaScript code
 */
export async function executeJavaScript(
  code: string,
  context: ExecutionContext,
  nodeId: string,
  outputVariable: string = 'result'
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Create context object for JavaScript to access
    const contextForJS = {
      ...context.variables,
    };

    // Add results from previous nodes
    context.results.forEach((result, id) => {
      contextForJS[id] = result.output;
    });

    // Create function with context
    const wrappedCode = `
      (function(context) {
        ${code}
      })(context);
    `;

    // Execute code
    const result = new Function('context', `
      ${code}
    `)(contextForJS);

    const output = result?.toString() || '';
    const duration = Date.now() - startTime;

    return {
      nodeId,
      output,
      executedAt: new Date().toISOString(),
      metadata: {
        runtime: 'native-js',
        duration,
        outputVariable,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      nodeId,
      output: '',
      error: error.message || 'JavaScript execution failed',
      executedAt: new Date().toISOString(),
      metadata: {
        runtime: 'native-js',
        duration,
      },
    };
  }
}
