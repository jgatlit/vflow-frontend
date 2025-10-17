/**
 * TopBar Component
 *
 * Unified top navigation bar consolidating all canvas controls:
 * - Left: History, Flows toggle
 * - Right: Save indicator, Import, Export, Run Flow
 */

import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';

interface TopBarProps {
  onHistoryClick: () => void;
  onFlowsToggle: () => void;
  onRunFlow: () => void;
  isExecuting: boolean;
  historyCount: number;
  showFlows: boolean;
  flowTitle: string;
  flowDescription: string;
  onFlowTitleChange: (title: string) => void;
  onFlowDescriptionChange: (description: string) => void;
}

const TopBar = ({
  onHistoryClick,
  onFlowsToggle,
  onRunFlow,
  isExecuting,
  historyCount,
  showFlows,
  flowTitle,
  flowDescription,
  onFlowTitleChange,
  onFlowDescriptionChange,
}: TopBarProps) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  useEffect(() => {
    // Show saving indicator when nodes or edges change
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      setSaveStatus('saved');
      setLastSaved(new Date());
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-7 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-2 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-1">
        <button
          onClick={onHistoryClick}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <span>📊</span>
          <span>History</span>
          {historyCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onFlowsToggle}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
            showFlows
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>📁</span>
          <span>Flows</span>
        </button>
      </div>

      {/* Center Section - Flow Title & Description */}
      <div className="flex-1 flex items-center justify-center gap-2 px-4">
        <input
          type="text"
          value={flowTitle}
          onChange={(e) => onFlowTitleChange(e.target.value)}
          placeholder="Flow Title"
          className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none text-center w-32 placeholder-gray-400"
        />
        <span className="text-gray-400">•</span>
        <input
          type="text"
          value={flowDescription}
          onChange={(e) => onFlowDescriptionChange(e.target.value)}
          placeholder="Description"
          className="text-xs text-gray-600 bg-transparent border-none outline-none text-center w-40 placeholder-gray-400"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Save Status Indicator */}
        <div className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-50 rounded">
          {saveStatus === 'saving' && (
            <>
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">
                Saved {lastSaved && `at ${formatTime(lastSaved)}`}
              </span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-red-600">Error</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300"></div>

        {/* Import/Export Buttons */}
        <ReactFlowProvider>
          <ImportButton />
          <ExportButton />
        </ReactFlowProvider>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300"></div>

        {/* Run Flow Button */}
        <button
          onClick={onRunFlow}
          disabled={isExecuting || nodes.length === 0}
          className="bg-green-500 text-white px-2 py-0.5 rounded font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs"
        >
          {isExecuting ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <span>▶️</span>
              <span>Run Flow</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
