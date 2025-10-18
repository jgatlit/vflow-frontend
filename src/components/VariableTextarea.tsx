import { useRef, useEffect, useState } from 'react';
import { extractVariables } from '../utils/variables';

interface VariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  label?: string;
}

const VariableTextarea = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  minHeight = '100px',
  label
}: VariableTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(minHeight);

  // Auto-resize textarea based on content
  const adjustHeight = () => {
    if (textareaRef.current) {
      // Reset height to min to get accurate scrollHeight
      textareaRef.current.style.height = minHeight;
      const scrollHeight = textareaRef.current.scrollHeight;

      // Set to scrollHeight or max 400px
      const newHeight = Math.min(scrollHeight, 400);
      const heightPx = `${newHeight}px`;

      textareaRef.current.style.height = heightPx;
      setCurrentHeight(heightPx);

      // Sync highlight layer height
      if (highlightRef.current) {
        highlightRef.current.style.height = heightPx;
      }
    }
  };

  // Adjust height on value change
  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Generate highlighted HTML
  const getHighlightedText = () => {
    if (!value) return '';

    return value.replace(
      /(\{\{[^}]+\}\})/g,
      '<span style="background-color: #dbeafe; color: #1e40af; padding: 0 4px; border-radius: 3px; font-weight: 600;">$1</span>'
    );
  };

  const variables = extractVariables(value);

  // Check if content exceeds max height (400px)
  const hasScrollableContent = textareaRef.current
    ? textareaRef.current.scrollHeight > 400
    : false;

  // Count lines in content
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <div className="relative">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {hasScrollableContent && (
            <span className="text-xs text-blue-600" title="Scroll to see all content">
              ⬇️ {lineCount} lines (scrollable)
            </span>
          )}
        </div>
      )}

      <div className="relative">
        {/* Highlight layer - shows behind textarea */}
        <div
          ref={highlightRef}
          className={`absolute top-0 left-0 right-0 pointer-events-none overflow-auto whitespace-pre-wrap break-words ${className}`}
          style={{
            height: currentHeight,
            minHeight,
            padding: '0.5rem 0.75rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            color: '#1f2937',
            zIndex: 1
          }}
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        />

        {/* Actual textarea - visible when focused for caret */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`relative w-full resize-y font-mono text-sm ${className}`}
          style={{
            height: currentHeight,
            minHeight,
            maxHeight: '400px',
            padding: '0.5rem 0.75rem',
            background: isFocused ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
            color: isFocused ? '#1f2937' : 'transparent',
            caretColor: '#000',
            zIndex: 2,
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none',
            overflowY: hasScrollableContent ? 'auto' : 'hidden'
          }}
        />
      </div>

      {/* Variable chips below */}
      {variables.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-gray-500">🔗 Variables:</span>
          {Array.from(new Set(variables)).map((variable) => (
            <span
              key={variable}
              style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {`{{${variable}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableTextarea;
