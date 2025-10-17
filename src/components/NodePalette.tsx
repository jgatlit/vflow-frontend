const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="absolute top-12 left-4 z-10 bg-white rounded-lg shadow-lg p-4 w-64">
      <h3 className="font-semibold text-sm mb-3 text-gray-700">Node Palette</h3>
      <div className="space-y-2">
        {/* OpenAI Node */}
        <div
          className="border-2 border-blue-400 rounded-lg p-3 cursor-move hover:border-blue-600 hover:bg-blue-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'openai')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-medium text-sm">OpenAI</div>
              <div className="text-xs text-gray-500">GPT-5, GPT-4</div>
            </div>
          </div>
        </div>

        {/* Anthropic Node */}
        <div
          className="border-2 border-purple-400 rounded-lg p-3 cursor-move hover:border-purple-600 hover:bg-purple-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'anthropic')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="font-medium text-sm">Anthropic</div>
              <div className="text-xs text-gray-500">Claude Sonnet 4.5</div>
            </div>
          </div>
        </div>

        {/* Gemini Node */}
        <div
          className="border-2 border-green-400 rounded-lg p-3 cursor-move hover:border-green-600 hover:bg-green-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'gemini')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <div>
              <div className="font-medium text-sm">Google Gemini</div>
              <div className="text-xs text-gray-500">2.5 Pro, Flash</div>
            </div>
          </div>
        </div>

        {/* Notes Node */}
        <div
          className="border-2 border-yellow-400 rounded-lg p-3 cursor-move hover:border-yellow-600 hover:bg-yellow-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'notes')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-medium text-sm">Notes</div>
              <div className="text-xs text-gray-500">Documentation</div>
            </div>
          </div>
        </div>

        {/* Python Code Node */}
        <div
          className="border-2 border-purple-500 rounded-lg p-3 cursor-move hover:border-purple-700 hover:bg-purple-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'python')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐍</span>
            <div>
              <div className="font-medium text-sm">Python Code</div>
              <div className="text-xs text-gray-500">Pyodide runtime</div>
            </div>
          </div>
        </div>

        {/* JavaScript Code Node */}
        <div
          className="border-2 border-yellow-500 rounded-lg p-3 cursor-move hover:border-yellow-700 hover:bg-yellow-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'javascript')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="font-medium text-sm">JavaScript Code</div>
              <div className="text-xs text-gray-500">Native runtime</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
        Drag nodes onto the canvas to add them
      </div>
    </aside>
  );
};

export default NodePalette;
