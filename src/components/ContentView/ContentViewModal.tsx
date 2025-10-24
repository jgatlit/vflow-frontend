/**
 * ContentViewModal Component
 * Modal container for rendering structured content in various formats
 * Follows the TraceViewerModal pattern for consistency
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ContentViewModalProps } from '../../types/contentView';
import { HtmlRenderer } from './HtmlRenderer';
import { MarkdownRenderer } from './MarkdownRenderer';

export function ContentViewModal({
  isOpen,
  onClose,
  content,
  format,
  title,
}: ContentViewModalProps) {
  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get format badge styling
  const getFormatBadge = () => {
    const badges = {
      html: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HTML' },
      markdown: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Markdown' },
      json: { bg: 'bg-green-100', text: 'text-green-700', label: 'JSON' },
      csv: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'CSV' },
    };

    const badge = badges[format];

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Render appropriate component based on format
  const renderContent = () => {
    switch (format) {
      case 'html':
        return <HtmlRenderer content={content} format={format} title={title} />;
      case 'markdown':
        return <MarkdownRenderer content={content} format={format} title={title} />;
      case 'json':
        // TODO: Will be implemented in full version
        return (
          <div className="p-6 text-center text-gray-500">
            <p>JSON renderer coming soon...</p>
            <pre className="mt-4 text-left text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {content}
            </pre>
          </div>
        );
      case 'csv':
        // TODO: Will be implemented in full version
        return (
          <div className="p-6 text-center text-gray-500">
            <p>CSV renderer coming soon...</p>
            <pre className="mt-4 text-left text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {content}
            </pre>
          </div>
        );
      default:
        return (
          <div className="p-6 text-center text-gray-500">
            Unsupported format: {format}
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800">Content Viewer</h2>
            {getFormatBadge()}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-md transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Close content viewer"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
