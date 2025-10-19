/**
 * TopBar Component
 *
 * Unified top navigation bar consolidating all canvas controls:
 * - Left: History, Flows toggle, New Flow
 * - Center: Flow name (editable)
 * - Right: Autosave indicator, Save button, Import, Export, Run Flow
 */

import { ReactFlowProvider } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';
import AutosaveIndicator from './AutosaveIndicator';
import type { AutosaveStatus } from '../hooks/useFlowPersistence';

interface TopBarProps {
  onHistoryClick: () => void;
  onFlowsToggle: () => void;
  onRunFlow: () => void;
  onSaveFlow: () => Promise<any>;
  onNewFlow: () => void;
  isExecuting: boolean;
  historyCount: number;
  showFlows: boolean;
  flowName: string;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
  onFlowNameChange: (name: string) => void;
}

const TopBar = ({
  onHistoryClick,
  onFlowsToggle,
  onRunFlow,
  onSaveFlow,
  onNewFlow,
  isExecuting,
  historyCount,
  showFlows,
  flowName,
  autosaveStatus,
  lastSavedAt,
  isDirty,
  onFlowNameChange,
}: TopBarProps) => {
  const nodes = useFlowStore((state) => state.nodes);

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-3 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewFlow}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="New Flow"
        >
          <span>📄</span>
          <span>New</span>
        </button>

        <button
          onClick={onHistoryClick}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <span>📊</span>
          <span>History</span>
          {historyCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onFlowsToggle}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            showFlows
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>📁</span>
          <span>Flows</span>
        </button>
      </div>

      {/* Center Section - Autosave Indicator */}
      <div className="flex-1 flex items-center justify-center">
        <AutosaveIndicator
          status={autosaveStatus}
          lastSavedAt={lastSavedAt}
          flowName={flowName}
          isDirty={isDirty}
          onFlowNameChange={onFlowNameChange}
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Manual Save Button */}
        <button
          onClick={onSaveFlow}
          disabled={autosaveStatus === 'saving'}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Save flow to database"
        >
          <span>💾</span>
          <span>Save</span>
        </button>

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
