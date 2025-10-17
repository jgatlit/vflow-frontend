/**
 * UnifiedControls Component
 *
 * Groups Save indicator, Import, and Export buttons in a single container
 * to prevent overlap and provide cohesive layout.
 */

import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';

const UnifiedControls = () => {
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
    <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-white rounded-lg shadow-lg px-4 py-2">
      {/* Save Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {saveStatus === 'saving' && (
          <>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Saving...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">
              Saved {lastSaved && `at ${formatTime(lastSaved)}`}
            </span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-600">Error saving</span>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300"></div>

      {/* Import/Export Buttons */}
      <ReactFlowProvider>
        <ImportButton />
        <ExportButton />
      </ReactFlowProvider>
    </div>
  );
};

export default UnifiedControls;
