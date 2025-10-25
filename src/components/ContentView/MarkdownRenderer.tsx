/**
 * MarkdownRenderer Component
 * Renders Markdown content with custom styling
 * Uses react-markdown with security best practices
 */

import { useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import type { ContentViewerProps } from '../../types/contentView';
import { extractPureContent } from '../../utils/contentDetection';
import { preprocessTableHTML, containsTables } from '../../utils/tablePreprocessor';

export function MarkdownRenderer({ content, title }: ContentViewerProps) {
  const [copied, setCopied] = useState(false);
  const markdownRef = useRef<HTMLDivElement>(null);

  // Extract pure Markdown content (remove JSON wrappers, etc.)
  const pureContent = useMemo(() => {
    return extractPureContent(content, 'markdown');
  }, [content]);

  const handleCopy = async () => {
    // Copy the rendered HTML content as rich text
    if (!markdownRef.current) return;

    try {
      let htmlContent = markdownRef.current.innerHTML;

      // Preprocess tables for rich text editor compatibility
      if (containsTables(htmlContent)) {
        console.log('Tables detected - preprocessing for rich text compatibility...');
        htmlContent = preprocessTableHTML(htmlContent);
        console.log('Table preprocessing complete');
      }

      // Create a Blob with both HTML and plain text formats
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([pureContent], { type: 'text/plain' });

      // Use the modern Clipboard API to write both formats
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });

      await navigator.clipboard.write([clipboardItem]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy formatted text:', err);

      // Fallback: try to copy just the HTML using the older method
      try {
        let htmlContent = markdownRef.current!.innerHTML;

        // Preprocess tables for fallback method too
        if (containsTables(htmlContent)) {
          htmlContent = preprocessTableHTML(htmlContent);
        }

        // Create a temporary div with the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-999999px';
        tempDiv.style.top = '-999999px';
        document.body.appendChild(tempDiv);

        // Select the content
        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Copy
        document.execCommand('copy');

        // Cleanup
        selection?.removeAllRanges();
        document.body.removeChild(tempDiv);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        alert('Failed to copy formatted text. Please try selecting and copying manually.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">
          {title || 'Markdown Content'}
        </h3>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-white hover:bg-gray-100 border border-gray-300'
          }`}
          title="Copy formatted text to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Rendered Markdown */}
      <div className="flex-1 overflow-auto">
        <div ref={markdownRef} className="prose prose-sm max-w-none p-6 bg-white rounded border border-gray-200">
          <ReactMarkdown
            skipHtml={true}
            components={{
              // Headings with better spacing
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-gray-200" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-base font-semibold mt-3 mb-2" {...props} />
              ),
              h5: ({ node, ...props }) => (
                <h5 className="text-sm font-semibold mt-3 mb-2" {...props} />
              ),
              h6: ({ node, ...props }) => (
                <h6 className="text-sm font-medium mt-2 mb-1 text-gray-600" {...props} />
              ),

              // Paragraphs
              p: ({ node, ...props }) => (
                <p className="my-3 leading-relaxed" {...props} />
              ),

              // Lists
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="leading-relaxed" {...props} />
              ),

              // Code blocks
              code: ({ node, inline, className, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code
                      className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className="block bg-gray-900 text-gray-100 p-4 rounded-md text-sm font-mono overflow-x-auto my-3"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              // Blockquotes
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 italic text-gray-700"
                  {...props}
                />
              ),

              // Horizontal rules
              hr: ({ node, ...props }) => (
                <hr className="my-6 border-t-2 border-gray-200" {...props} />
              ),

              // Links
              a: ({ node, ...props }) => (
                <a
                  className="text-blue-600 hover:text-blue-800 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),

              // Images
              img: ({ node, ...props }) => (
                <img
                  className="max-w-full h-auto rounded-lg shadow-md my-4"
                  {...props}
                />
              ),

              // Tables
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-gray-300" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-gray-100" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-gray-300 px-4 py-2" {...props} />
              ),

              // Strong/Bold
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-gray-900" {...props} />
              ),

              // Emphasis/Italic
              em: ({ node, ...props }) => (
                <em className="italic text-gray-700" {...props} />
              ),
            }}
          >
            {pureContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Size: {pureContent.length.toLocaleString()} characters</span>
          <span>Lines: {pureContent.split('\n').length.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
