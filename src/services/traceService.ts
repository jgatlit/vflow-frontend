/**
 * Trace Service
 *
 * Provides TypeScript types and utilities for working with LangSmith trace data.
 * Fetches and processes trace information from the backend API.
 */

/**
 * LangSmith trace data structure
 * Represents a complete trace with parent run, child runs, and metadata
 */
export interface LangSmithTrace {
  parent: {
    id: string;
    name: string;
    run_type: 'llm' | 'chain' | 'tool' | 'retriever';
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    start_time: string;  // ISO 8601 format
    end_time: string;    // ISO 8601 format
    status: 'success' | 'error';
    error: string | null;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost: number | null;
    trace_id: string;
    parent_run_id: string | null;
    child_run_ids: string[] | null;
    extra?: {
      metadata?: Record<string, any>;
    };
  };
  children: Array<LangSmithTrace['parent']>;
  metadata: {
    total_runs: number;
    fetched_at: string;
  };
}

/**
 * Fetch trace data from the backend API
 *
 * @param traceId - The LangSmith trace/run ID
 * @param forceRefresh - If true, bypass backend cache and fetch fresh from LangSmith
 * @returns Promise resolving to LangSmithTrace data
 * @throws Error if trace fetch fails
 */
export async function fetchTrace(traceId: string, forceRefresh = false): Promise<LangSmithTrace> {
  try {
    const url = `/api/traces/${traceId}${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText;
      throw new Error(`Failed to fetch trace: ${errorMessage}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error fetching trace');
  }
}

/**
 * Calculate duration in milliseconds between two ISO 8601 timestamps
 *
 * @param startTime - ISO 8601 start timestamp
 * @param endTime - ISO 8601 end timestamp
 * @returns Duration in milliseconds
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  // Handle invalid dates
  if (isNaN(start) || isNaN(end)) {
    return 0;
  }

  return end - start;
}

/**
 * Format duration milliseconds into human-readable string
 *
 * Examples:
 * - 500 -> "500ms"
 * - 1500 -> "1.50s"
 * - 65000 -> "1.08m"
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  // Handle invalid or zero duration
  if (ms === 0 || isNaN(ms)) {
    return '0ms';
  }

  // Less than 1 second - show milliseconds
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  // Less than 1 minute - show seconds
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // 1 minute or more - show minutes
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Calculate total cost from trace data
 * Sums parent and all children costs
 *
 * @param trace - LangSmithTrace data
 * @returns Total cost in dollars, or null if no cost data
 */
export function calculateTotalCost(trace: LangSmithTrace): number | null {
  let totalCost = trace.parent.total_cost ?? 0;

  for (const child of trace.children) {
    if (child.total_cost) {
      totalCost += child.total_cost;
    }
  }

  return totalCost > 0 ? totalCost : null;
}

/**
 * Calculate total tokens from trace data
 * Sums parent and all children token counts
 *
 * @param trace - LangSmithTrace data
 * @returns Total token count
 */
export function calculateTotalTokens(trace: LangSmithTrace): number {
  let totalTokens = trace.parent.total_tokens ?? 0;

  for (const child of trace.children) {
    if (child.total_tokens) {
      totalTokens += child.total_tokens;
    }
  }

  return totalTokens;
}

/**
 * Get status emoji for trace status
 *
 * @param status - Trace status
 * @returns Emoji representing status
 */
export function getStatusEmoji(status: 'success' | 'error'): string {
  return status === 'success' ? '✓' : '❌';
}

/**
 * Get color class for trace status
 *
 * @param status - Trace status
 * @returns Tailwind CSS color class
 */
export function getStatusColorClass(status: 'success' | 'error'): string {
  return status === 'success' ? 'text-green-600' : 'text-red-600';
}

/**
 * Get background color class for trace status
 *
 * @param status - Trace status
 * @returns Tailwind CSS background color class
 */
export function getStatusBgClass(status: 'success' | 'error'): string {
  return status === 'success' ? 'bg-green-500' : 'bg-red-500';
}
