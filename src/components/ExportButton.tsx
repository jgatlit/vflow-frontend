/**
 * Export Button Component
 *
 * Button and modal for exporting workflows to .vflow format.
 */

import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Download, X, AlertTriangle } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { performExport } from '../services/WorkflowExportService';
import { isSafeToExport } from '../utils/secretScanning';
import type { ExportOptions } from '../types/workflow-export';
import { cn } from '../lib/utils';

export default function ExportButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const { getViewport } = useReactFlow();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const [formData, setFormData] = useState<ExportOptions>({
    name: 'My Workflow',
    description: '',
    author: '',
    tags: [],
  });

  const handleOpenModal = () => {
    // Pre-fill with current flow name if available
    const currentFlowId = useFlowStore.getState().currentFlowId;
    const currentFlow = useFlowStore
      .getState()
      .savedFlows.find((f) => f.id === currentFlowId);

    setFormData({
      name: currentFlow?.name || 'My Workflow',
      description: '',
      author: '',
      tags: [],
    });

    setError(null);
    setWarnings([]);
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    setError(null);
    setWarnings([]);
    setIsExporting(true);

    try {
      const viewport = getViewport();

      // Quick validation check
      const quickWorkflow = {
        version: '1.0.0',
        schemaVersion: 'v1',
        meta: {
          name: formData.name || 'Untitled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        flow: { nodes, edges, viewport },
        credentials: [],
        settings: {},
      };

      const safety = isSafeToExport(quickWorkflow);
      if (!safety.safe) {
        setError('Cannot export: Secrets detected in workflow');
        setWarnings(
          safety.secrets.map(
            (s) => `${s.type} found in ${s.location}: ${s.redacted}`
          )
        );
        setIsExporting(false);
        return;
      }

      if (safety.warnings.length > 0) {
        setWarnings(safety.warnings);
      }

      // Perform export
      const result = await performExport(nodes, edges, viewport, formData);

      if (result.success) {
        setIsModalOpen(false);
        // Success notification could go here
        console.log('Export successful');
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!formData.tags?.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...(formData.tags || []), newTag],
        });
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <>
      {/* Export Button */}
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="Export workflow"
      >
        <Download className="w-3 h-3" />
        Export
      </button>

      {/* Export Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Export Workflow
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Workflow Name */}
              <div>
                <label
                  htmlFor="workflow-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Workflow Name *
                </label>
                <input
                  type="text"
                  id="workflow-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Workflow"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="workflow-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="workflow-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe your workflow..."
                  rows={3}
                />
              </div>

              {/* Author */}
              <div>
                <label
                  htmlFor="workflow-author"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Author
                </label>
                <input
                  type="text"
                  id="workflow-author"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name or email"
                />
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="workflow-tags"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tags
                </label>
                <input
                  type="text"
                  id="workflow-tags"
                  onKeyDown={handleTagInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Press Enter to add tags"
                />
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Warnings
                      </p>
                      <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                        {warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  Export will create a .vflow file containing your workflow
                  structure. Credential values are not exported, only
                  references.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || !formData.name}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isExporting ? 'Exporting...' : 'Export Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
