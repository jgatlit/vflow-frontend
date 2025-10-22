import type { FC } from 'react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tool } from '../../types/tools';
import { ToolCard } from './ToolCard';

export interface ToolSelectorProps {
  availableTools: Tool[];
  selectedToolIds: string[];
  maxTools?: number;
  onToggle: (toolId: string) => void;
  onConfigure: (toolId: string) => void;
  onClose: () => void;
}

export const ToolSelector: FC<ToolSelectorProps> = ({
  availableTools,
  selectedToolIds,
  maxTools = 10,
  onToggle,
  onConfigure,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter tools
  const filteredTools = useMemo(() => {
    return availableTools.filter(tool => {
      const matchesSearch = tool.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableTools, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(availableTools.map(t => t.category)));
  }, [availableTools]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-teal-500 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Select Tools</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-teal-600 rounded p-1 transition-colors"
              aria-label="Close tool selector"
            >
              ✕
            </button>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full px-3 py-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>

        {/* Category Filter */}
        <div className="border-b border-gray-200 p-3 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="text-sm text-gray-600 mb-3">
            {selectedToolIds.length} / {maxTools} tools selected
          </div>

          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredTools.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  enabled={selectedToolIds.includes(tool.id)}
                  onToggle={() => onToggle(tool.id)}
                  onConfigure={() => onConfigure(tool.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No tools found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
