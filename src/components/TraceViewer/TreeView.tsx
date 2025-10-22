/**
 * TreeView Component
 *
 * Displays hierarchical trace visualization with expand/collapse functionality.
 * Shows parent span with children spans, duration bars, and status indicators.
 */

import { useState } from 'react';
import {
  formatDuration,
  calculateDuration,
  getStatusColorClass,
  getStatusBgClass,
  type LangSmithTrace,
} from '../../services/traceService';

interface TreeViewProps {
  trace: LangSmithTrace;
}

/**
 * TreeView component for hierarchical span display
 *
 * Features:
 * - Expandable/collapsible spans
 * - Visual duration bars
 * - Status indicators (success/error)
 * - Span selection
 * - Percentage calculations
 */
export function TreeView({ trace }: TreeViewProps) {
  // Track expanded span IDs (parent expanded by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set([trace.parent.id])
  );

  // Track selected span ID
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * Toggle expand/collapse state for a span
   */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate total duration from parent span
  const totalDuration = calculateDuration(
    trace.parent.start_time,
    trace.parent.end_time
  );

  return (
    <div className="space-y-2">
      {/* Parent span row */}
      <SpanRow
        span={trace.parent}
        depth={0}
        isExpanded={expandedIds.has(trace.parent.id)}
        isSelected={selectedId === trace.parent.id}
        onToggleExpand={() => toggleExpand(trace.parent.id)}
        onSelect={() => setSelectedId(trace.parent.id)}
        totalDuration={totalDuration}
      />

      {/* Child spans (only if parent is expanded) */}
      {expandedIds.has(trace.parent.id) &&
        trace.children.map((child) => (
          <SpanRow
            key={child.id}
            span={child}
            depth={1}
            isExpanded={expandedIds.has(child.id)}
            isSelected={selectedId === child.id}
            onToggleExpand={() => toggleExpand(child.id)}
            onSelect={() => setSelectedId(child.id)}
            totalDuration={totalDuration}
          />
        ))}
    </div>
  );
}

interface SpanRowProps {
  span: LangSmithTrace['parent'];
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  totalDuration: number;
}

/**
 * SpanRow component - displays a single span in the tree
 *
 * Layout (left to right):
 * [chevron] [status-icon] [name................] [duration] [percentage] [duration-bar]
 *    ▼         ✓         Step 1: Tool Call      0.123s        10%       ▓▓░░░░░░░░
 */
function SpanRow({
  span,
  depth,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  totalDuration,
}: SpanRowProps) {
  // Calculate duration for this span
  const duration = calculateDuration(span.start_time, span.end_time);

  // Calculate percentage of total duration
  const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

  // Status-based colors
  const statusColor = getStatusColorClass(span.status);
  const barColor = getStatusBgClass(span.status);

  // Background color based on selection state
  const bgColor = isSelected
    ? 'bg-blue-50 border-l-4 border-blue-500'
    : 'hover:bg-gray-50';

  // Determine chevron display
  const hasChildren = span.child_run_ids && span.child_run_ids.length > 0;
  const chevronIcon = hasChildren ? (isExpanded ? '▼' : '▶') : '·';

  // Determine status icon
  const statusIcon = span.status === 'success' ? '✓' : '❌';

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${bgColor}`}
      style={{ paddingLeft: `${depth * 24 + 8}px` }}
      onClick={onSelect}
    >
      {/* Chevron button for expand/collapse */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            onToggleExpand();
          }
        }}
        className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        aria-label={
          hasChildren
            ? isExpanded
              ? 'Collapse'
              : 'Expand'
            : 'No children'
        }
      >
        {chevronIcon}
      </button>

      {/* Status icon */}
      <span className={`flex items-center justify-center ${statusColor}`}>
        {statusIcon}
      </span>

      {/* Span name (flexible width) */}
      <span className={`flex-1 font-medium ${statusColor}`}>{span.name}</span>

      {/* Duration */}
      <span className="text-sm text-gray-600 min-w-[60px] text-right">
        {formatDuration(duration)}
      </span>

      {/* Percentage */}
      <span className="text-sm text-gray-500 min-w-[45px] text-right">
        {percentage.toFixed(0)}%
      </span>

      {/* Duration bar */}
      <div className="w-[100px] h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
          aria-label={`${percentage.toFixed(1)}% of total duration`}
        />
      </div>
    </div>
  );
}
