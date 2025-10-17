import { useState } from 'react';
import { useFlowStore } from '../store/flowStore';

interface FlowListSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const FlowListSidebar = ({ isOpen, onToggle }: FlowListSidebarProps) => {
  const [newFlowName, setNewFlowName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const savedFlows = useFlowStore((state) => state.savedFlows);
  const currentFlowId = useFlowStore((state) => state.currentFlowId);
  const saveFlow = useFlowStore((state) => state.saveFlow);
  const loadFlow = useFlowStore((state) => state.loadFlow);
  const deleteFlow = useFlowStore((state) => state.deleteFlow);
  const clearCanvas = useFlowStore((state) => state.clearCanvas);

  const handleSaveFlow = () => {
    if (newFlowName.trim()) {
      saveFlow(newFlowName.trim());
      setNewFlowName('');
      setShowSaveDialog(false);
    }
  };

  const getCurrentFlowName = () => {
    const currentFlow = savedFlows.find(f => f.id === currentFlowId);
    return currentFlow?.name || 'Untitled Flow';
  };

  return (
    <>

      {/* Sidebar */}
      {isOpen && (
        <div className="absolute bottom-24 left-4 z-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-300px)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Saved Flows</h2>
            <p className="text-xs text-gray-500 mt-1">
              Current: {getCurrentFlowName()}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-gray-200 space-y-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              💾 Save Current Flow
            </button>
            <button
              onClick={() => {
                if (confirm('Clear canvas? This will not delete saved flows.')) {
                  clearCanvas();
                }
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              🗑️ Clear Canvas
            </button>
          </div>

          {/* Flow List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {savedFlows.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No saved flows yet
              </p>
            ) : (
              savedFlows.map((flow) => (
                <div
                  key={flow.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    flow.id === currentFlowId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-800 truncate">
                        {flow.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {flow.nodes.length} nodes • {flow.edges.length} connections
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated: {new Date(flow.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => loadFlow(flow.id)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Load flow"
                      >
                        📂
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${flow.name}"?`)) {
                            deleteFlow(flow.id);
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete flow"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Flow</h3>
            <input
              type="text"
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSaveFlow();
              }}
              placeholder="Enter flow name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewFlowName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFlow}
                disabled={!newFlowName.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlowListSidebar;
