/**
 * Toolbar Component
 *
 * Top toolbar with import/export buttons and other canvas actions.
 */

import { ReactFlowProvider } from '@xyflow/react';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';

export default function Toolbar() {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <ReactFlowProvider>
        <ImportButton />
        <ExportButton />
      </ReactFlowProvider>
    </div>
  );
}
