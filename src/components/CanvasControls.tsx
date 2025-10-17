import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';

const CanvasControls = () => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const clearCanvas = useFlowStore((state) => state.clearCanvas);
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);

  const handleExportJSON = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(flowData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const flowData = JSON.parse(event.target?.result as string);
            if (flowData.nodes && flowData.edges) {
              useFlowStore.getState().setNodes(flowData.nodes);
              useFlowStore.getState().setEdges(flowData.edges);
              setTimeout(() => fitView(), 50);
            }
          } catch (error) {
            alert('Invalid flow file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [fitView]);

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="bg-white rounded-lg shadow-md p-2 flex flex-col gap-1">
        <button
          onClick={() => zoomIn()}
          className="p-2 hover:bg-gray-100 rounded text-gray-700 text-lg"
          title="Zoom in"
        >
          ➕
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-2 hover:bg-gray-100 rounded text-gray-700 text-lg"
          title="Zoom out"
        >
          ➖
        </button>
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-2 hover:bg-gray-100 rounded text-gray-700 text-sm"
          title="Fit view"
        >
          ⊡
        </button>
      </div>

      {/* Canvas Actions */}
      <div className="bg-white rounded-lg shadow-md p-2 flex flex-col gap-1">
        <button
          onClick={handleExportJSON}
          className="px-3 py-2 hover:bg-gray-100 rounded text-gray-700 text-sm whitespace-nowrap"
          title="Export flow"
        >
          💾 Export
        </button>
        <button
          onClick={handleImportJSON}
          className="px-3 py-2 hover:bg-gray-100 rounded text-gray-700 text-sm whitespace-nowrap"
          title="Import flow"
        >
          📂 Import
        </button>
        <button
          onClick={() => {
            if (confirm('Clear entire canvas?')) {
              clearCanvas();
            }
          }}
          className="px-3 py-2 hover:bg-red-50 rounded text-red-600 text-sm whitespace-nowrap"
          title="Clear canvas"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-3 text-xs text-gray-600">
        <div>Nodes: {nodes.length}</div>
        <div>Edges: {edges.length}</div>
      </div>
    </div>
  );
};

export default CanvasControls;
