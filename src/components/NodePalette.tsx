const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="absolute top-12 left-4 z-10 bg-white rounded-lg shadow-lg p-4 w-64">
      <h3 className="font-semibold text-sm mb-3 text-gray-700">Node Palette</h3>
      <div className="space-y-2">
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
              <div className="text-xs text-gray-500">Claude + Tools 🔧</div>
            </div>
          </div>
        </div>

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
              <div className="text-xs text-gray-500">GPT + Tools 🔧</div>
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
              <div className="text-xs text-gray-500">Gemini + Tools 🔧</div>
            </div>
          </div>
        </div>

        {/* Perplexity Node */}
        <div
          className="border-2 border-teal-400 rounded-lg p-3 cursor-move hover:border-teal-600 hover:bg-teal-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'perplexity')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-medium text-sm">Perplexity</div>
              <div className="text-xs text-gray-500">Search + Citations 📚</div>
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

        {/* Agent Node (Multi-Step Reasoning) */}
        <div
          className="border-2 border-purple-500 rounded-lg p-3 cursor-move hover:border-purple-700 hover:bg-purple-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'agent')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-medium text-sm">Agent (Multi-Step)</div>
              <div className="text-xs text-gray-500">Autonomous reasoning</div>
            </div>
          </div>
        </div>

        {/* Webhook Inbound Node */}
        <div
          className="border-2 border-blue-400 rounded-lg p-3 cursor-move hover:border-blue-600 hover:bg-blue-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'webhook-in')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪝</span>
            <div>
              <div className="font-medium text-sm">Webhook Inbound</div>
              <div className="text-xs text-gray-500">Trigger via HTTP</div>
            </div>
          </div>
        </div>

        {/* Webhook Outbound Node */}
        <div
          className="border-2 border-orange-400 rounded-lg p-3 cursor-move hover:border-orange-600 hover:bg-orange-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'webhook-out')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">📤</span>
            <div>
              <div className="font-medium text-sm">Webhook Outbound</div>
              <div className="text-xs text-gray-500">POST to external APIs</div>
            </div>
          </div>
        </div>

        {/* Mermaid Node */}
        <div
          className="border-2 border-cyan-500 rounded-lg p-3 cursor-move hover:border-cyan-600 hover:bg-cyan-50 transition-colors"
          draggable
          onDragStart={(e) => onDragStart(e, 'mermaid')}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-medium text-sm">Mermaid Diagram</div>
              <div className="text-xs text-gray-500">Render Charts 📊</div>
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
