/**
 * Content View Types
 * Type definitions for content format detection and rendering
 */

export type ContentFormat = 'html' | 'markdown' | 'json' | 'csv';

export interface DetectionResult {
  format: ContentFormat;
  confidence: number; // 0-100
  metadata?: {
    lineCount?: number;
    size?: number;
    columns?: string[]; // For CSV
    hasCodeBlocks?: boolean; // For Markdown
    hasHtmlTags?: boolean; // For HTML
  };
}

export interface ContentViewerProps {
  content: string;
  format: ContentFormat;
  title?: string;
}

export interface ContentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  format: ContentFormat;
  title?: string;
}
