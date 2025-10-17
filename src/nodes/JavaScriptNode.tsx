import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';

interface JavaScriptNodeData {
  title?: string;
  code: string;
  inputVariables?: string[];
  outputVariable?: string;
}

function JavaScriptNode({ id, data, selected }: NodeProps<JavaScriptNodeData>) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const handleDataChange = (key: keyof JavaScriptNodeData, value: any) => {
    updateNodeData(id, { [key]: value });
  };

  return (
    <div className="bg-white border-2 border-yellow-500 rounded-lg shadow-lg min-w-[350px]">
      <NodeResizer
        minWidth={350}
        minHeight={200}
        isVisible={selected}
        lineClassName="border-yellow-500"
        handleClassName="h-3 w-3 bg-yellow-500"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-yellow-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />

      <div className="p-4">
        {/* Header with Editable Title */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl">⚡</span>
              <input
                type="text"
                value={data.title || 'JavaScript Code'}
                onChange={(e) => handleDataChange('title', e.target.value)}
                className="font-semibold text-lg flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-yellow-300 rounded px-1"
                placeholder="Node Title"
              />
            </div>
            <span className="text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded">
              Native
            </span>
          </div>
          <div className="text-xs text-gray-500 ml-8">ID: {id}</div>
        </div>

        {/* Output Variable */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Output Variable Name
          </label>
          <input
            type="text"
            value={data.outputVariable || ''}
            onChange={(e) => handleDataChange('outputVariable', e.target.value)}
            placeholder="result"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Access this output in other nodes using: {'{'}{'{'}{data.outputVariable || 'result'}{'}'}{'}'}
          </p>
        </div>

        {/* Code Editor */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JavaScript Code
          </label>
          <textarea
            value={data.code || ''}
            onChange={(e) => handleDataChange('code', e.target.value)}
            placeholder={`// Access input variables from context\n// Example: const x = context.input_value;\n\n// Your code here\nconst result = "Hello from JavaScript!";\n\n// Return value will be stored in output variable\nreturn result;`}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
            spellCheck={false}
          />
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access variables: <code className="bg-white px-1 rounded">context.varName</code></li>
            <li>Use <code className="bg-white px-1 rounded">return</code> to set output value</li>
            <li>Use <code className="bg-white px-1 rounded">console.log()</code> for debugging</li>
            <li>Full ES6+ syntax supported</li>
          </ul>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-yellow-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </div>
  );
}

export default memo(JavaScriptNode);
