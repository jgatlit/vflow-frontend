import { useState, useEffect } from 'react';
import { db, type Flow, getAllFlows, searchFlows } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';

interface FlowListSidebarProps {
  isOpen: boolean;
  currentFlowId: string | null;
  onLoadFlow: (flowId: string) => void;
  onNewFlow: () => void;
}

const FlowListSidebar = ({ isOpen, currentFlowId, onLoadFlow, onNewFlow }: FlowListSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'executions'>('updated');

  // Live query for flows from database
  const rawFlows = useLiveQuery(
    async () => {
      if (searchQuery.trim()) {
        return await searchFlows(searchQuery);
      }
      return await getAllFlows();
    },
    [searchQuery]
  );

  // Sanitize flows to ensure all fields are the correct type
  const flows = rawFlows?.map(flow => ({
    ...flow,
    name: typeof flow.name === 'string' ? flow.name : 'Untitled Flow',
    description: typeof flow.description === 'string' ? flow.description : undefined,
    tags: Array.isArray(flow.tags) ? flow.tags.map(t => typeof t === 'string' ? t : String(t)) : [],
    status: typeof flow.status === 'string' ? flow.status : undefined,
    version: typeof flow.version === 'string' ? flow.version : '1.0.0',
    updatedAt: typeof flow.updatedAt === 'string' ? flow.updatedAt : new Date().toISOString(),
  }));

  // Sort flows based on selected criteria
  const sortedFlows = flows?.sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'name':
        return a.name.localeCompare(b.name);
      case 'executions':
        return (b.executionCount || 0) - (a.executionCount || 0);
      default:
        return 0;
    }
  });

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    if (confirm(`Delete "${flowName}"? This will mark it as deleted but can be recovered.`)) {
      await db.flows.update(flowId, {
        deleted: true,
        deletedAt: new Date().toISOString(),
      });
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 left-4 z-10 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Saved Flows</h2>
          <span className="text-xs text-gray-500">
            {flows?.length || 0} flows
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search flows by name, tags..."
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sort Controls */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <span className="text-xs text-gray-600">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="updated">Last Updated</option>
          <option value="created">Created Date</option>
          <option value="name">Name (A-Z)</option>
          <option value="executions">Executions</option>
        </select>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-b border-gray-200">
        <button
          onClick={onNewFlow}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          ➕ New Flow
        </button>
      </div>

      {/* Flow List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!flows ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Loading flows...</p>
          </div>
        ) : sortedFlows?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No flows match your search' : 'No saved flows yet'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 hover:underline mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          sortedFlows.map((flow) => (
            <div
              key={flow.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                flow.id === currentFlowId
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => onLoadFlow(flow.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Flow Name */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-gray-800 truncate">
                      {typeof flow.name === 'string' ? flow.name : 'Untitled Flow'}
                    </h3>
                    {flow.isFavorite && (
                      <span className="text-xs">⭐</span>
                    )}
                  </div>

                  {/* Description */}
                  {flow.description && typeof flow.description === 'string' && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {flow.description}
                    </p>
                  )}

                  {/* Tags */}
                  {flow.tags && flow.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {flow.tags.slice(0, 3).map((tag, index) => {
                        const tagText = typeof tag === 'string' ? tag : String(tag);
                        return (
                          <span
                            key={tagText + index}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {tagText}
                          </span>
                        );
                      })}
                      {flow.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{flow.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span title="Node count">
                      🔵 {flow.flow?.nodes?.length || 0}
                    </span>
                    <span title="Execution count">
                      ▶️ {flow.executionCount || 0}
                    </span>
                    {flow.successRate !== undefined && flow.executionCount && flow.executionCount > 0 && (
                      <span
                        title="Success rate"
                        className={
                          flow.successRate >= 80
                            ? 'text-green-600'
                            : flow.successRate >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        ✓ {Math.round(flow.successRate)}%
                      </span>
                    )}
                    <span title="Version">
                      v{flow.version || '1.0.0'}
                    </span>
                  </div>

                  {/* Time */}
                  <p className="text-xs text-gray-400 mt-1">
                    Updated {formatDate(flow.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadFlow(flow.id);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Load flow"
                  >
                    📂
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFlow(flow.id, flow.name);
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Delete flow"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              {flow.status && typeof flow.status === 'string' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      flow.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : flow.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : flow.status === 'archived'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {flow.status}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FlowListSidebar;
