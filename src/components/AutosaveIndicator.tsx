import { memo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AutosaveStatus } from '../hooks/useFlowPersistence';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: string | null;
  flowName: string;
  isDirty: boolean;
  autosaveEnabled: boolean; // NEW: Guard flag
  onFlowNameChange?: (name: string) => void;
  onAutosaveEnable?: () => void; // NEW: Callback to enable autosave after rename
}

const AutosaveIndicator = memo(({
  status,
  lastSavedAt,
  flowName,
  isDirty,
  autosaveEnabled,
  onFlowNameChange,
  onAutosaveEnable,
}: AutosaveIndicatorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(flowName);

  // Sync editName with flowName prop changes
  useEffect(() => {
    if (!isEditing) {
      // Ensure flowName is always a string
      const safeName = typeof flowName === 'string' ? flowName : 'Untitled Flow';
      setEditName(safeName);
    }
  }, [flowName, isEditing]);

  // Ensure flowName is always a string (defensive programming)
  const safeFlowName = typeof flowName === 'string' ? flowName : 'Untitled Flow';

  const getStatusDisplay = () => {
    // Check autosave disabled state first (NEW)
    if (!autosaveEnabled) {
      return {
        icon: '🔒',
        text: 'Autosave disabled - Save to enable',
        className: 'text-orange-600 bg-orange-50',
      };
    }

    switch (status) {
      case 'saving':
        return {
          icon: '⏳',
          text: 'Saving...',
          className: 'text-blue-600 bg-blue-50',
        };
      case 'saved':
        return {
          icon: '✓',
          text: 'Saved',
          className: 'text-green-600 bg-green-50',
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'Save failed',
          className: 'text-red-600 bg-red-50',
        };
      case 'idle':
      default:
        return isDirty
          ? {
              icon: '●',
              text: 'Unsaved changes',
              className: 'text-orange-600 bg-orange-50',
            }
          : {
              icon: '○',
              text: 'Up to date',
              className: 'text-gray-500 bg-gray-50',
            };
    }
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;

    try {
      const date = new Date(lastSavedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  const lastSavedDisplay = formatLastSaved();

  const handleNameSave = async () => {
    const trimmedName = editName.trim();

    // Validate name
    if (!trimmedName || trimmedName === safeFlowName) {
      setEditName(safeFlowName);
      setIsEditing(false);
      return;
    }

    try {
      // Update flow name
      if (onFlowNameChange) {
        await onFlowNameChange(trimmedName);
      }

      // CRITICAL: Enable autosave after explicit rename
      if (onAutosaveEnable) {
        onAutosaveEnable();
      }

      setIsEditing(false);

      // Show toast notification
      toast.success('Flow renamed', {
        description: `Autosave is now enabled for "${trimmedName}"`,
      });
    } catch (error) {
      console.error('Failed to rename flow:', error);
      toast.error('Failed to rename flow');
      setEditName(safeFlowName);
      setIsEditing(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(safeFlowName);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-md border border-gray-200 bg-white shadow-sm">
      {/* Flow Name */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            autoFocus
            className="text-sm font-medium text-gray-700 bg-transparent border-b border-blue-500 focus:outline-none min-w-[120px]"
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onFlowNameChange && setIsEditing(true)}
            title="Click to rename"
          >
            {safeFlowName}
          </span>
        )}
        {isDirty && status !== 'saving' && (
          <span className="text-xs text-orange-600" title="Unsaved changes">
            *
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-gray-300" />

      {/* Status Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${statusDisplay.className}`}
        title={lastSavedDisplay ? `Last saved ${lastSavedDisplay}` : undefined}
      >
        <span>{statusDisplay.icon}</span>
        <span>{statusDisplay.text}</span>
      </div>

      {/* Last Saved Time */}
      {lastSavedDisplay && status === 'idle' && (
        <span className="text-xs text-gray-500">{lastSavedDisplay}</span>
      )}
    </div>
  );
});

AutosaveIndicator.displayName = 'AutosaveIndicator';

export default AutosaveIndicator;
