import { useState, useEffect } from 'react';
import {
  calculateDuration,
  formatDuration,
  calculateTotalCost,
  calculateTotalTokens,
  getStatusEmoji,
  type LangSmithTrace,
} from '../../services/traceService';
import { TreeView } from './TreeView';
import { useTraceCache } from '../../contexts/TraceCacheContext';

interface TraceViewerModalProps {
  traceId: string;
  onClose: () => void;
}

/**
 * TraceViewerModal Component
 *
 * Full-screen modal for viewing LangSmith trace data with tree visualization.
 * Displays trace summary (status, duration, tokens, cost) and hierarchical span tree.
 *
 * Features:
 * - Loading state with spinner
 * - Error state with error message
 * - Summary card with gradient background
 * - Placeholder for TreeView component
 * - Responsive design with max-width 6xl and 90vh height
 *
 * @param traceId - LangSmith trace/run ID to fetch and display
 * @param onClose - Callback function to close the modal
 */
export function TraceViewerModal({ traceId, onClose }: TraceViewerModalProps) {
  const [trace, setTrace] = useState<LangSmithTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getTrace } = useTraceCache();

  useEffect(() => {
    async function loadTrace() {
      try {
        setLoading(true);
        setError(null);
        // Use cache context which will check frontend cache first, then backend cache, then LangSmith
        const data = await getTrace(traceId);
        setTrace(data);
      } catch (err: any) {
        console.error('Failed to load trace:', err);
        setError(err.message || 'Unknown error loading trace');
      } finally {
        setLoading(false);
      }
    }

    loadTrace();
  }, [traceId, getTrace]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-600 font-medium">Loading trace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <h3 className="text-lg font-semibold text-red-600 mb-3">
            Error Loading Trace
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No trace data
  if (!trace) return null;

  // Calculate trace metrics
  const duration = calculateDuration(trace.parent.start_time, trace.parent.end_time);
  const totalTokens = calculateTotalTokens(trace);
  const totalCost = calculateTotalCost(trace);
  const statusEmoji = getStatusEmoji(trace.parent.status);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Trace Viewer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Close trace viewer"
          >
            ✕
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center gap-6 mb-3">
            <span className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-2xl">{statusEmoji}</span>
              {trace.parent.status === 'success' ? 'Success' : 'Error'}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/80">Duration:</span>
              <span className="font-semibold">{formatDuration(duration)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/80">Tokens:</span>
              <span className="font-semibold">{totalTokens.toLocaleString()}</span>
            </span>
            {totalCost !== null && (
              <span className="flex items-center gap-2">
                <span className="text-white/80">Cost:</span>
                <span className="font-semibold">${totalCost.toFixed(4)}</span>
              </span>
            )}
          </div>

          <div className="text-sm text-white/90">
            <div className="flex items-center gap-4">
              <span>
                <span className="text-white/80">Trace ID:</span>{' '}
                <span className="font-mono">{trace.parent.id}</span>
              </span>
              <span>
                <span className="text-white/80">Run Type:</span>{' '}
                <span className="font-medium">{trace.parent.run_type}</span>
              </span>
              <span>
                <span className="text-white/80">Total Runs:</span>{' '}
                <span className="font-medium">{trace.metadata.total_runs}</span>
              </span>
            </div>
          </div>

          {trace.parent.error && (
            <div className="mt-3 p-3 bg-red-500/20 border border-red-300/30 rounded-md">
              <p className="text-sm font-medium text-red-100">
                Error: {trace.parent.error}
              </p>
            </div>
          )}
        </div>

        {/* Tree View */}
        <div className="flex-1 overflow-auto p-6">
          <TreeView trace={trace} />
        </div>
      </div>
    </div>
  );
}
