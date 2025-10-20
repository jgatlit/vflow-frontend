/**
 * Import Button Component
 *
 * Button and file upload for importing workflows from .vflow format.
 */

import { useState, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import {
  importWorkflow,
  needsCredentialMapping,
  getCredentialReferences,
  applyWorkflowToCanvas,
} from '../services/WorkflowImportService';
import type { WorkflowExport } from '../types/workflow-export';
import { cn } from '../lib/utils';
import CredentialMappingModal from './CredentialMappingModal';

interface ImportButtonProps {
  onImportComplete?: (flowName: string) => void;
}

/**
 * Generate timestamp suffix in MMMDD-hhmm format
 * Example: "Oct19-1430"
 */
function generateTimestampSuffix(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${month}${day}-${hours}${minutes}`;
}

export default function ImportButton({ onImportComplete }: ImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importedWorkflow, setImportedWorkflow] = useState<WorkflowExport | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setViewport, fitView } = useReactFlow();
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[import] Starting import', { filename: file.name });

    setIsImporting(true);
    setError(null);
    setSuccess(false);

    try {
      // Import and validate
      const result = await importWorkflow(file);

      if (!result.success || !result.workflow) {
        setError(result.error || 'Import failed');
        setIsImporting(false);
        return;
      }

      // Check if credential mapping is needed
      if (needsCredentialMapping(result.workflow)) {
        setImportedWorkflow(result.workflow);
        setShowCredentialModal(true);
        setIsImporting(false);
      } else {
        // Apply directly
        applyWorkflowToCanvas(
          result.workflow,
          {},
          setNodes,
          setEdges,
          setViewport
        );

        // Extract and clean flow name from .vflow filename, append timestamp
        const baseName = result.workflow.meta?.name || 'Imported Flow';
        const timestamp = generateTimestampSuffix();
        const cleanedName = `${baseName} ${timestamp}`;

        console.log('[import] Direct import success', {
          baseName,
          timestamp,
          finalName: cleanedName,
          nodesCount: result.workflow.flow.nodes?.length
        });

        // Notify parent to update flow metadata (deduplicates name if exists)
        try {
          await onImportComplete?.(cleanedName);
          console.log('[import] onImportComplete finished');
        } catch (importErr) {
          console.error('[import] onImportComplete failed:', importErr);
          throw importErr;
        }

        setSuccess(true);
        setTimeout(() => {
          fitView({ padding: 0.2 });
        }, 100);

        setIsImporting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setIsImporting(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCredentialMappingComplete = async (mappings: Record<string, string>) => {
    if (!importedWorkflow) return;

    try {
      // Apply workflow with credential mappings
      applyWorkflowToCanvas(
        importedWorkflow,
        mappings,
        setNodes,
        setEdges,
        setViewport
      );

      // Extract and clean flow name, append timestamp
      const baseName = importedWorkflow.meta?.name || 'Imported Flow';
      const timestamp = generateTimestampSuffix();
      const cleanedName = `${baseName} ${timestamp}`;

      console.log('[import] Credential-mapped import success', {
        baseName,
        timestamp,
        finalName: cleanedName,
        mappingsCount: Object.keys(mappings).length
      });

      // Notify parent to update flow metadata (deduplicates name if exists)
      await onImportComplete?.(cleanedName);

      setSuccess(true);
      setShowCredentialModal(false);
      setImportedWorkflow(null);

      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply workflow');
    }
  };

  const handleCredentialMappingCancel = () => {
    setShowCredentialModal(false);
    setImportedWorkflow(null);
  };

  return (
    <>
      {/* Import Button */}
      <button
        onClick={handleFileSelect}
        disabled={isImporting}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50',
          'focus:outline-none focus:ring-1 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Import workflow"
      >
        <Upload className="w-3 h-3" />
        {isImporting ? 'Importing...' : 'Import'}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".vflow,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Success notification */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Workflow imported successfully
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your workflow has been loaded to the canvas.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Import failed</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Credential Mapping Modal */}
      {showCredentialModal && importedWorkflow && (
        <CredentialMappingModal
          credentialReferences={getCredentialReferences(importedWorkflow)}
          onComplete={handleCredentialMappingComplete}
          onCancel={handleCredentialMappingCancel}
        />
      )}
    </>
  );
}
