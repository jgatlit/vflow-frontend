import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import type { MermaidNodeData, MermaidPreset } from '../types/mermaid';
import { Eye, EyeOff, Save, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const BUILT_IN_PRESETS: MermaidPreset[] = [
  {
    name: 'Flowchart',
    diagram: 'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Sequence',
    diagram: 'sequenceDiagram\n  Client->>Server: Request\n  Server->>DB: Query\n  DB-->>Server: Result\n  Server-->>Client: Response',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'ER Diagram',
    diagram: 'erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains\n  PRODUCT ||--o{ LINE-ITEM : includes',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'State Machine',
    diagram: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Processing: start\n  Processing --> Done: complete\n  Processing --> Error: fail\n  Done --> [*]\n  Error --> [*]',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Gantt Chart',
    diagram: 'gantt\n  title Project Plan\n  dateFormat YYYY-MM-DD\n  section Phase 1\n  Task A :a1, 2024-01-01, 30d\n  Task B :after a1, 20d',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Pie Chart',
    diagram: 'pie title Distribution\n  "Category A" : 40\n  "Category B" : 35\n  "Category C" : 25',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Mindmap',
    diagram: 'mindmap\n  root((Topic))\n    Branch A\n      Leaf 1\n      Leaf 2\n    Branch B\n      Leaf 3\n      Leaf 4',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Architecture',
    diagram: 'architecture-beta\n  service api(server)[API]\n  service db(database)[Database]\n  api:R --> L:db',
    operation: 'render',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Extract & Render',
    diagram: '<!-- upstream markdown -->',
    operation: 'extract',
    theme: 'default',
    config: {},
    builtIn: true,
  },
  {
    name: 'Syntax Check',
    diagram: '<!-- upstream content -->',
    operation: 'parse',
    theme: 'default',
    config: {},
    builtIn: true,
  },
];

const MermaidNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as MermaidNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize presets if empty
  useEffect(() => {
    if (!nodeData.presets || nodeData.presets.length === 0) {
      handleDataChange('presets', BUILT_IN_PRESETS);
    }
  }, []);

  const handleDataChange = (field: keyof MermaidNodeData, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  // Debounced validation
  const validateDiagram = (diagram: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    setIsValidating(true);

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const apiUrl = import.meta.env.VITE_MERMAID_API_URL || 'https://chart.chem.dev';
        const response = await fetch(`${apiUrl}/api/v1/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagram }),
        });

        const result = await response.json();

        if (result.valid) {
          setValidationStatus({
            valid: true,
            message: `Valid: ${result.diagramType || 'unknown type'}`,
          });
        } else {
          setValidationStatus({
            valid: false,
            message: 'Invalid diagram syntax',
          });
        }
      } catch (error: any) {
        setValidationStatus({
          valid: false,
          message: `Validation error: ${error.message}`,
        });
      } finally {
        setIsValidating(false);
      }
    }, 500);
  };

  // Debounced preview rendering
  const renderPreview = (diagram: string, theme: string) => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    setIsRendering(true);

    renderTimeoutRef.current = setTimeout(async () => {
      try {
        const apiUrl = import.meta.env.VITE_MERMAID_API_URL || 'https://chart.chem.dev';
        const response = await fetch(`${apiUrl}/api/v1/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diagram,
            outputFormat: 'svg-string',
            config: { theme },
          }),
        });

        const result = await response.json();

        if (result.svg) {
          // Sanitize SVG
          const sanitizedSvg = sanitizeSvg(result.svg);
          handleDataChange('previewSvg', sanitizedSvg);
          handleDataChange('previewError', null);
        } else {
          handleDataChange('previewError', 'Failed to render diagram');
        }
      } catch (error: any) {
        handleDataChange('previewError', error.message || 'Render failed');
      } finally {
        setIsRendering(false);
      }
    }, 500);
  };

  // SVG sanitization
  const sanitizeSvg = (svg: string): string => {
    // Remove script tags
    let sanitized = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/\son\w+='[^']*'/gi, '');

    return sanitized;
  };

  const handleDiagramChange = (newDiagram: string) => {
    handleDataChange('diagram', newDiagram);

    // Trigger validation
    if (newDiagram.trim()) {
      validateDiagram(newDiagram);

      // Trigger preview if enabled
      if (nodeData.showPreview) {
        renderPreview(newDiagram, nodeData.theme);
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    handleDataChange('theme', newTheme);

    // Re-render preview with new theme
    if (nodeData.showPreview && nodeData.diagram.trim()) {
      renderPreview(nodeData.diagram, newTheme);
    }
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = [...BUILT_IN_PRESETS, ...nodeData.presets].find((p) => p.name === presetName);

    if (preset) {
      handleDataChange('diagram', preset.diagram);
      handleDataChange('operation', preset.operation);
      handleDataChange('theme', preset.theme);
      handleDataChange('config', preset.config);
      handleDataChange('activePreset', preset.name);

      // Trigger validation and preview
      validateDiagram(preset.diagram);
      if (nodeData.showPreview) {
        renderPreview(preset.diagram, preset.theme);
      }
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: MermaidPreset = {
      name: newPresetName.trim(),
      diagram: nodeData.diagram,
      operation: nodeData.operation,
      theme: nodeData.theme,
      config: nodeData.config,
      builtIn: false,
    };

    const updatedPresets = [...nodeData.presets, newPreset];
    handleDataChange('presets', updatedPresets);
    setNewPresetName('');
    setShowPresetInput(false);
  };

  const handleRenamePreset = (oldName: string) => {
    if (!editingPresetName.trim() || editingPresetName === oldName) {
      setEditingPresetId(null);
      return;
    }

    const updatedPresets = nodeData.presets.map((p) =>
      p.name === oldName ? { ...p, name: editingPresetName.trim() } : p
    );

    handleDataChange('presets', updatedPresets);
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const handleDeletePreset = (presetName: string) => {
    const updatedPresets = nodeData.presets.filter((p) => p.name !== presetName);
    handleDataChange('presets', updatedPresets);

    if (nodeData.activePreset === presetName) {
      handleDataChange('activePreset', null);
    }
  };

  const allPresets = [...BUILT_IN_PRESETS, ...nodeData.presets];

  return (
    <>
      <NodeResizer minWidth={450} minHeight={500} isVisible={selected} />

      <Handle type="target" position={Position.Top} id="input" className="!bg-cyan-500" />

      <div
        className={`bg-white rounded-lg shadow-lg border-2 border-cyan-500 p-4 min-w-[450px] ${
          nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
        }`}
      >
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <input
              type="text"
              value={nodeData.title || 'Mermaid Diagram'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg border-none outline-none flex-1"
              placeholder="Mermaid Diagram"
            />
            <button
              onClick={() => handleDataChange('bypassed', !nodeData.bypassed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                nodeData.bypassed
                  ? 'bg-gray-400 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={nodeData.bypassed ? 'Node is bypassed - click to activate' : 'Node is active - click to bypass'}
            >
              {nodeData.bypassed ? '⏸ Bypassed' : '▶ Active'}
            </button>
          </div>
          <div className="text-xs text-gray-500">ID: {id}</div>
        </div>

        {/* Input Mode */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Input Mode</label>
          <div className="flex gap-2">
            {(['auto', 'editor', 'upstream'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`inputMode-${id}`}
                  checked={nodeData.inputMode === mode}
                  onChange={() => handleDataChange('inputMode', mode)}
                  className="cursor-pointer"
                />
                <span className="text-sm capitalize">{mode}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Operation */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
          <div className="flex gap-2 flex-wrap">
            {(['render', 'parse', 'detect', 'extract', 'batch'] as const).map((op) => (
              <label key={op} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`operation-${id}`}
                  checked={nodeData.operation === op}
                  onChange={() => handleDataChange('operation', op)}
                  className="cursor-pointer"
                />
                <span className="text-sm capitalize">{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
          <div className="flex gap-2">
            {(['default', 'dark', 'forest', 'neutral', 'base'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  nodeData.theme === theme
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Management */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preset Library</label>

          {/* Load Preset Dropdown */}
          <select
            value={nodeData.activePreset || ''}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">-- Select Preset --</option>
            <optgroup label="Built-in Presets">
              {BUILT_IN_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
            {nodeData.presets.length > 0 && (
              <optgroup label="Custom Presets">
                {nodeData.presets.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Save New Preset */}
          {!showPresetInput && (
            <button
              onClick={() => setShowPresetInput(true)}
              className="w-full px-3 py-1 text-sm bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors flex items-center justify-center gap-1"
            >
              <Save size={14} />
              Save as New Preset
            </button>
          )}

          {showPresetInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={handleSavePreset}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowPresetInput(false);
                  setNewPresetName('');
                }}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Custom Preset List */}
          {nodeData.presets.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium text-gray-600">Custom Presets:</div>
              {nodeData.presets.map((preset) => (
                <div key={preset.name} className="flex items-center gap-2 text-sm">
                  {editingPresetId === preset.name ? (
                    <>
                      <input
                        type="text"
                        value={editingPresetName}
                        onChange={(e) => setEditingPresetName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenamePreset(preset.name)}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPresetId(null)}
                        className="p-1 text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs">{preset.name}</span>
                      <button
                        onClick={() => {
                          setEditingPresetId(preset.name);
                          setEditingPresetName(preset.name);
                        }}
                        className="p-1 text-cyan-600 hover:text-cyan-700"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.name)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preset Selector (Variable) */}
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Preset Selector (Variable)
            </label>
            <input
              type="text"
              value={nodeData.presetSelector || ''}
              onChange={(e) => handleDataChange('presetSelector', e.target.value)}
              placeholder="{{preset_name}}"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <div className="text-xs text-gray-500 mt-1">
              Resolves preset at execution time from upstream node output
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Diagram Code</label>
            <button
              onClick={() => handleDataChange('editorCollapsed', !nodeData.editorCollapsed)}
              className="text-gray-500 hover:text-gray-700"
            >
              {nodeData.editorCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {!nodeData.editorCollapsed && (
            <>
              <textarea
                value={nodeData.diagram || ''}
                onChange={(e) => handleDiagramChange(e.target.value)}
                className="w-full px-2 py-2 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400"
                rows={10}
                placeholder="graph TD&#10;  A[Start] --> B[End]"
              />

              {/* Validation Status */}
              {isValidating && (
                <div className="text-xs text-gray-500 mt-1">Validating...</div>
              )}
              {validationStatus && !isValidating && (
                <div
                  className={`text-xs mt-1 ${
                    validationStatus.valid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {validationStatus.valid ? '✅' : '❌'} {validationStatus.message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Preview */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Live Preview</label>
            <button
              onClick={() => {
                const newShowPreview = !nodeData.showPreview;
                handleDataChange('showPreview', newShowPreview);

                // Trigger render if enabling preview
                if (newShowPreview && nodeData.diagram.trim()) {
                  renderPreview(nodeData.diagram, nodeData.theme);
                }
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              {nodeData.showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          {nodeData.showPreview && (
            <div className="border border-gray-300 rounded p-2 max-h-[300px] overflow-auto bg-gray-50">
              {isRendering && (
                <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                  Rendering...
                </div>
              )}

              {!isRendering && nodeData.previewError && (
                <div className="text-sm text-red-600">{nodeData.previewError}</div>
              )}

              {!isRendering && !nodeData.previewError && nodeData.previewSvg && (
                <div
                  dangerouslySetInnerHTML={{ __html: nodeData.previewSvg }}
                  className="flex items-center justify-center"
                />
              )}

              {!isRendering && !nodeData.previewError && !nodeData.previewSvg && (
                <div className="text-sm text-gray-500">No preview available</div>
              )}
            </div>
          )}
        </div>

        {/* Output Variable */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Output Variable</label>
          <input
            type="text"
            value={`{{${nodeData.outputVariable}}}`}
            readOnly
            className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded cursor-not-allowed"
          />
          <div className="text-xs text-gray-500 mt-1">
            Access output fields based on operation:
            <ul className="list-disc list-inside ml-2">
              <li>
                Render: <code>{`{{${nodeData.outputVariable}.svg}}`}</code>
              </li>
              <li>
                Parse: <code>{`{{${nodeData.outputVariable}.valid}}`}</code>
              </li>
              <li>
                Detect: <code>{`{{${nodeData.outputVariable}.diagramType}}`}</code>
              </li>
              <li>
                Extract: <code>{`{{${nodeData.outputVariable}.diagrams}}`}</code>
              </li>
              <li>
                Batch: <code>{`{{${nodeData.outputVariable}.results}}`}</code>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="output" className="!bg-cyan-500" />
    </>
  );
});

MermaidNode.displayName = 'MermaidNode';

export default MermaidNode;
