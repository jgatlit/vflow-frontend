/**
 * HtmlRenderer Component
 * Renders sanitized HTML content in a safe manner
 * Uses DOMPurify to prevent XSS attacks
 */

import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';
import type { ContentViewerProps } from '../../types/contentView';
import { extractPureContent } from '../../utils/contentDetection';

/**
 * DOMPurify configuration for safe HTML rendering
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'span', 'div', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'code', 'pre', 'blockquote', 'hr', 'b', 'i',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style',
    'width', 'height', 'border', 'cellspacing', 'cellpadding',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

export function HtmlRenderer({ content, title }: ContentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [renderMode, setRenderMode] = useState<'safe' | 'sandbox'>('sandbox');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  // Extract pure HTML content (remove JSON wrappers, etc.)
  const pureContent = useMemo(() => {
    return extractPureContent(content, 'html');
  }, [content]);

  // Sanitize HTML content (for safe mode)
  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(pureContent, PURIFY_CONFIG);
  }, [pureContent]);

  // Check if sanitization removed content
  const wasSanitized = sanitizedHtml.length < pureContent.length * 0.9;

  const handleCopy = () => {
    navigator.clipboard.writeText(pureContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch('/api/artifacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pureContent,
          title: title || 'HTML Artifact',
          sourceType: 'execution_result',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish artifact');
      }

      const data = await response.json();
      setPublishedUrl(data.url);
    } catch (error) {
      console.error('Error publishing artifact:', error);
      alert('Failed to publish HTML. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl).then(() => {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy URL:', err);
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-800">
            {title || 'HTML Content'}
          </h3>
          {wasSanitized && renderMode === 'safe' && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Some potentially unsafe content was removed for security
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Render mode toggle */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
            <button
              onClick={() => setRenderMode('sandbox')}
              className={`px-2 py-0.5 rounded transition-colors ${
                renderMode === 'sandbox'
                  ? 'bg-white shadow-sm font-medium'
                  : 'hover:bg-gray-200'
              }`}
              title="Full rendering with CSS/JS in secure sandbox"
            >
              Full
            </button>
            <button
              onClick={() => setRenderMode('safe')}
              className={`px-2 py-0.5 rounded transition-colors ${
                renderMode === 'safe'
                  ? 'bg-white shadow-sm font-medium'
                  : 'hover:bg-gray-200'
              }`}
              title="Sanitized rendering (no scripts)"
            >
              Safe
            </button>
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !!publishedUrl}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
              publishedUrl
                ? 'bg-green-100 text-green-700 border border-green-300'
                : isPublishing
                ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-wait'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title="Publish HTML and get shareable link"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : publishedUrl ? (
              <>
                <Check className="w-4 h-4" />
                Published
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Publish
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
              copied
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-white hover:bg-gray-100 border border-gray-300'
            }`}
            title="Copy HTML to clipboard"
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
      </div>

      {/* Published URL Section */}
      {publishedUrl && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-medium text-green-800 mb-1">
                Published Successfully!
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={publishedUrl}
                  readOnly
                  className="flex-1 px-2 py-1 text-sm bg-white border border-green-300 rounded font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopyUrl}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
                    urlCopied
                      ? 'bg-green-600 text-white'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  title="Copy URL to clipboard"
                >
                  {urlCopied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy URL
                    </>
                  )}
                </button>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rendered HTML */}
      <div className="flex-1 overflow-auto">
        {renderMode === 'sandbox' ? (
          <iframe
            srcDoc={pureContent}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            className="w-full h-full border border-gray-200 rounded bg-white"
            title="HTML Content (Sandboxed)"
          />
        ) : (
          <div
            className="prose prose-sm max-w-none p-4 bg-white rounded border border-gray-200"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Size: {pureContent.length.toLocaleString()} characters</span>
          <span>
            {renderMode === 'sandbox'
              ? '🔒 Sandboxed (CSS/JS enabled)'
              : '🔒 Sanitized with DOMPurify'}
          </span>
        </div>
      </div>
    </div>
  );
}
