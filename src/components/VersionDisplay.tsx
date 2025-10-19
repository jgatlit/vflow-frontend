/**
 * Version Display Component
 *
 * Replaces the React Flow attribution with vFlow version info
 * Positioned at bottom-right corner of the canvas
 */

import { Panel } from '@xyflow/react';
import { getVersionString, AUTHOR } from '../version';

export default function VersionDisplay() {
  return (
    <Panel position="bottom-right" className="version-display">
      <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-md shadow-sm border border-gray-200 font-medium">
        {getVersionString()} |{' '}
        <a
          href="http://aichemist.agency"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          {AUTHOR}
        </a>
      </div>
    </Panel>
  );
}
