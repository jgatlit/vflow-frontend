import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';

interface PythonNodeData {
  title?: string;
  code: string;
  inputVariables?: string[];
  outputVariable?: string;
}

function PythonNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as PythonNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const handleDataChange = (key: keyof PythonNodeData, value: any) => {
    updateNodeData(id, { [key]: value });
  };

  return (
    <div className="bg-white border-2 border-purple-500 rounded-lg shadow-lg min-w-[350px]">
      <NodeResizer
        minWidth={350}
        minHeight={200}
        isVisible={selected}
        lineClassName="border-purple-500"
        handleClassName="h-3 w-3 bg-purple-500"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />

      <div className="p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl">🐍</span>
              <input
                type="text"
                value={nodeData.title || 'Python Code'}
                onChange={(e) => handleDataChange('title', e.target.value)}
                className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1"
                placeholder="Node Title"
              />
            </div>
            <span className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded">
              Pyodide
            </span>
          </div>
          <div className="text-xs text-gray-500 ml-8">ID: {id}</div>
        </div>

        {/* Output Variable */}
        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-gray-600 flex items-center gap-1 mb-3">
          <span className="font-semibold">💡 Output:</span>
          <span>Reference using</span>
          <span className="font-mono text-yellow-700">{'{{'}</span>
          <input
            type="text"
            value={nodeData.outputVariable || id}
            onChange={(e) => handleDataChange('outputVariable', e.target.value)}
            className="bg-white px-1 py-0.5 rounded font-mono text-yellow-700 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 hover:border-yellow-300 transition-colors min-w-[4ch]"
            placeholder={id}
            title="Click to edit output variable name"
            style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
          />
          <span className="font-mono text-yellow-700">{'}}'}</span>
        </div>

        {/* Code Editor */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Python Code
          </label>
          <textarea
            value={nodeData.code || ''}
            onChange={(e) => handleDataChange('code', e.target.value)}
            placeholder={`# Access input variables from context\n# Example: x = context.get('input_value')\n\nimport json\n\n# Your code here\nresult = "Hello from Python!"\n\n# Return value will be stored in output variable\nresult`}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            spellCheck={false}
          />
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access variables: <code className="bg-white px-1 rounded">context.get('varName')</code></li>
            <li>Last expression is returned as output</li>
            <li>Use <code className="bg-white px-1 rounded">print()</code> for debugging (shown in console)</li>
            <li>Most Python stdlib available via Pyodide</li>
          </ul>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </div>
  );
}

export default memo(PythonNode);
