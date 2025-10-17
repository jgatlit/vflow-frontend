/**
 * Credential Mapping Modal Component
 *
 * Displays credential references from imported workflow and allows mapping
 * to existing credentials or creating new ones.
 */

import { useState } from 'react';
import { X, Key, Plus, AlertTriangle } from 'lucide-react';
import type { CredentialReference } from '../types/workflow-export';
import { cn } from '../lib/utils';

interface CredentialMappingModalProps {
  credentialReferences: CredentialReference[];
  onComplete: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

interface CredentialAction {
  type: 'skip' | 'map' | 'create';
  targetId?: string;
  newCredentialName?: string;
}

export default function CredentialMappingModal({
  credentialReferences,
  onComplete,
  onCancel,
}: CredentialMappingModalProps) {
  const [actions, setActions] = useState<Record<string, CredentialAction>>(
    () => {
      // Initialize with 'skip' for all credentials
      const initial: Record<string, CredentialAction> = {};
      credentialReferences.forEach((ref) => {
        initial[ref.id] = { type: 'skip' };
      });
      return initial;
    }
  );

  const [showCreateForm, setShowCreateForm] = useState<string | null>(null);
  const [newCredentialName, setNewCredentialName] = useState('');

  const handleActionChange = (
    credId: string,
    type: 'skip' | 'map' | 'create'
  ) => {
    setActions({
      ...actions,
      [credId]: { type },
    });

    if (type === 'create') {
      setShowCreateForm(credId);
    } else {
      setShowCreateForm(null);
    }
  };

  const handleCreateCredential = (credId: string) => {
    if (!newCredentialName.trim()) {
      alert('Please enter a credential name');
      return;
    }

    // For now, we'll just skip since we don't have a full credential management system
    // In a real implementation, this would call an API to create the credential
    setActions({
      ...actions,
      [credId]: {
        type: 'create',
        newCredentialName: newCredentialName.trim(),
      },
    });

    setShowCreateForm(null);
    setNewCredentialName('');
  };

  const handleComplete = () => {
    // Build mappings from actions
    const mappings: Record<string, string> = {};

    credentialReferences.forEach((ref) => {
      const action = actions[ref.id];

      if (action.type === 'map' && action.targetId) {
        mappings[ref.id] = action.targetId;
      } else if (action.type === 'create') {
        // For now, use the original ID since we're not actually creating credentials
        // In a real implementation, this would be the newly created credential ID
        mappings[ref.id] = ref.id;
      }
      // Skip means don't include in mappings
    });

    onComplete(mappings);
  };

  const canComplete = credentialReferences.every((ref) => {
    const action = actions[ref.id];
    return (
      action.type === 'skip' ||
      (action.type === 'map' && action.targetId) ||
      action.type === 'create'
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Map Credentials
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Credential References Found
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  This workflow references {credentialReferences.length}{' '}
                  credential(s). Choose how to handle each one:
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4">
                  <li>
                    <strong>Skip:</strong> Nodes will not have credentials
                    assigned
                  </li>
                  <li>
                    <strong>Create New:</strong> Placeholder for credential
                    (you'll need to configure it later)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {credentialReferences.map((ref) => (
              <div
                key={ref.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                {/* Credential Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{ref.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                        {ref.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used in {ref.usedInNodes.length} node(s):{' '}
                      {ref.usedInNodes.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Action Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Action:
                  </label>

                  <div className="flex flex-col gap-2">
                    {/* Skip */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`action-${ref.id}`}
                        checked={actions[ref.id]?.type === 'skip'}
                        onChange={() => handleActionChange(ref.id, 'skip')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        Skip (no credential assigned)
                      </span>
                    </label>

                    {/* Create New */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`action-${ref.id}`}
                        checked={actions[ref.id]?.type === 'create'}
                        onChange={() => handleActionChange(ref.id, 'create')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        Create new credential placeholder
                      </span>
                    </label>
                  </div>

                  {/* Create Form */}
                  {showCreateForm === ref.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Credential Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCredentialName}
                          onChange={(e) => setNewCredentialName(e.target.value)}
                          placeholder={ref.name}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleCreateCredential(ref.id)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: You'll need to configure the actual credential
                        values later.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Import Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
