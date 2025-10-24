/**
 * Content Detection Utility
 * Detects content format (HTML, Markdown, JSON, CSV) with confidence scoring
 */

import type { DetectionResult, ContentFormat } from '../types/contentView';

/**
 * Detect HTML content
 */
function detectHtml(content: string): { isHtml: boolean; confidence: number } {
  const trimmed = content.trim();

  // Check for HTML tags
  const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;
  const hasHtmlTags = htmlTagPattern.test(trimmed);

  if (!hasHtmlTags) {
    return { isHtml: false, confidence: 0 };
  }

  // Count HTML-like patterns
  const tagMatches = trimmed.match(/<\/?[a-z][^>]*>/gi) || [];
  const tagCount = tagMatches.length;

  // Check for common HTML structures
  const hasDoctype = /<!DOCTYPE/i.test(trimmed);
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);
  const hasHeadTag = /<head[\s>]/i.test(trimmed);
  const hasBodyTag = /<body[\s>]/i.test(trimmed);
  const hasDiv = /<div[\s>]/i.test(trimmed);
  const hasPara = /<p[\s>]/i.test(trimmed);

  // Calculate confidence
  let confidence = 0;

  if (tagCount > 0) confidence += 30;
  if (tagCount > 5) confidence += 20;
  if (tagCount > 10) confidence += 10;

  if (hasDoctype) confidence += 15;
  if (hasHtmlTag) confidence += 10;
  if (hasHeadTag) confidence += 5;
  if (hasBodyTag) confidence += 5;
  if (hasDiv || hasPara) confidence += 5;

  // Check for closing tags (indicates proper HTML structure)
  const openTags = (trimmed.match(/<[a-z][^>]*>/gi) || []).length;
  const closeTags = (trimmed.match(/<\/[a-z][^>]*>/gi) || []).length;
  const hasClosingTags = closeTags > 0 && closeTags >= openTags * 0.5;

  if (hasClosingTags) confidence += 10;

  return {
    isHtml: confidence >= 50,
    confidence: Math.min(confidence, 100),
  };
}

/**
 * Detect Markdown content
 */
function detectMarkdown(content: string): { isMarkdown: boolean; confidence: number } {
  const trimmed = content.trim();
  const lines = trimmed.split('\n');

  if (lines.length === 0) {
    return { isMarkdown: false, confidence: 0 };
  }

  let confidence = 0;
  let markdownFeatures = 0;

  // Check for markdown patterns
  const hasHeadings = /^#{1,6}\s+.+/m.test(trimmed);
  const hasBoldItalic = /(\*\*|__).+\1|(\*|_).+\2/.test(trimmed);
  const hasCodeBlocks = /```[\s\S]*?```|`[^`]+`/.test(trimmed);
  const hasLinks = /\[.+?\]\(.+?\)/.test(trimmed);
  const hasImages = /!\[.*?\]\(.+?\)/.test(trimmed);
  const hasUnorderedLists = /^[\s]*[-*+]\s+.+/m.test(trimmed);
  const hasOrderedLists = /^[\s]*\d+\.\s+.+/m.test(trimmed);
  const hasBlockquotes = /^>\s+.+/m.test(trimmed);
  const hasHorizontalRules = /^[\s]*(-{3,}|\*{3,}|_{3,})[\s]*$/m.test(trimmed);
  const hasTables = /\|.+\|/.test(trimmed);

  // Count features
  if (hasHeadings) { confidence += 15; markdownFeatures++; }
  if (hasBoldItalic) { confidence += 10; markdownFeatures++; }
  if (hasCodeBlocks) { confidence += 15; markdownFeatures++; }
  if (hasLinks) { confidence += 12; markdownFeatures++; }
  if (hasImages) { confidence += 10; markdownFeatures++; }
  if (hasUnorderedLists) { confidence += 10; markdownFeatures++; }
  if (hasOrderedLists) { confidence += 10; markdownFeatures++; }
  if (hasBlockquotes) { confidence += 8; markdownFeatures++; }
  if (hasHorizontalRules) { confidence += 5; markdownFeatures++; }
  if (hasTables) { confidence += 10; markdownFeatures++; }

  // Boost confidence if multiple features present
  if (markdownFeatures >= 3) confidence += 10;
  if (markdownFeatures >= 5) confidence += 10;

  return {
    isMarkdown: confidence >= 40,
    confidence: Math.min(confidence, 100),
  };
}

/**
 * Detect JSON content
 */
function detectJson(content: string): { isJson: boolean; confidence: number } {
  const trimmed = content.trim();

  // Must start with { or [
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { isJson: false, confidence: 0 };
  }

  try {
    JSON.parse(trimmed);
    return { isJson: true, confidence: 95 };
  } catch {
    // Check if it looks like JSON but is malformed
    const looksLikeJson = /^[\s]*[{\[][\s\S]*[}\]][\s]*$/.test(trimmed);
    return {
      isJson: false,
      confidence: looksLikeJson ? 30 : 0,
    };
  }
}

/**
 * Detect CSV content
 */
function detectCsv(content: string): { isCsv: boolean; confidence: number } {
  const trimmed = content.trim();
  const lines = trimmed.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return { isCsv: false, confidence: 0 };
  }

  // Check for consistent delimiters (comma or tab)
  const commaDelimited = lines.every(line => line.includes(','));
  const tabDelimited = lines.every(line => line.includes('\t'));

  if (!commaDelimited && !tabDelimited) {
    return { isCsv: false, confidence: 0 };
  }

  // Count columns in each line
  const delimiter = commaDelimited ? ',' : '\t';
  const columnCounts = lines.map(line => line.split(delimiter).length);

  // Check if column counts are consistent
  const firstColumnCount = columnCounts[0];
  const isConsistent = columnCounts.every(count => count === firstColumnCount);

  if (!isConsistent) {
    return { isCsv: false, confidence: 20 };
  }

  // Check if first row looks like headers (non-numeric)
  const firstRow = lines[0].split(delimiter);
  const hasHeaders = firstRow.some(cell => isNaN(Number(cell.trim())));

  let confidence = 50;
  if (isConsistent) confidence += 30;
  if (hasHeaders) confidence += 15;
  if (lines.length > 10) confidence += 5;

  return {
    isCsv: confidence >= 60,
    confidence: Math.min(confidence, 100),
  };
}

/**
 * Main content format detection function
 * Returns the detected format with highest confidence
 */
export function detectContentFormat(content: string): DetectionResult | null {
  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return null;
  }

  const trimmed = content.trim();
  const lineCount = trimmed.split('\n').length;
  const size = trimmed.length;

  // Run all detectors
  const htmlResult = detectHtml(trimmed);
  const markdownResult = detectMarkdown(trimmed);
  const jsonResult = detectJson(trimmed);
  const csvResult = detectCsv(trimmed);

  // Priority: HTML > JSON > CSV > Markdown (most specific to least specific)
  // HTML and JSON are more specific formats, so prioritize them

  const detections: Array<{ format: ContentFormat; confidence: number }> = [];

  if (htmlResult.isHtml && htmlResult.confidence >= 50) {
    detections.push({ format: 'html', confidence: htmlResult.confidence });
  }

  if (jsonResult.isJson && jsonResult.confidence >= 50) {
    detections.push({ format: 'json', confidence: jsonResult.confidence });
  }

  if (csvResult.isCsv && csvResult.confidence >= 60) {
    detections.push({ format: 'csv', confidence: csvResult.confidence });
  }

  if (markdownResult.isMarkdown && markdownResult.confidence >= 40) {
    detections.push({ format: 'markdown', confidence: markdownResult.confidence });
  }

  // No format detected with sufficient confidence
  if (detections.length === 0) {
    return null;
  }

  // Return format with highest confidence
  const bestMatch = detections.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  // Build metadata based on format
  const metadata: DetectionResult['metadata'] = {
    lineCount,
    size,
  };

  if (bestMatch.format === 'html') {
    metadata.hasHtmlTags = htmlResult.isHtml;
  } else if (bestMatch.format === 'markdown') {
    metadata.hasCodeBlocks = /```[\s\S]*?```/.test(trimmed);
  } else if (bestMatch.format === 'csv') {
    const delimiter = trimmed.includes('\t') ? '\t' : ',';
    const firstLine = trimmed.split('\n')[0];
    metadata.columns = firstLine.split(delimiter).map(col => col.trim());
  }

  return {
    format: bestMatch.format,
    confidence: bestMatch.confidence,
    metadata,
  };
}

/**
 * Helper function to check if content should show VIEW button
 */
export function shouldShowViewButton(content: string): boolean {
  const result = detectContentFormat(content);
  return result !== null && result.confidence >= 50;
}

/**
 * Extract pure content from JSON wrappers or other text containers
 * Handles cases where HTML/Markdown is embedded in JSON fields
 */
export function extractPureContent(content: string, format: ContentFormat): string {
  const trimmed = content.trim();

  // Try to parse as JSON and extract format-specific field
  if (format === 'html' || format === 'markdown') {
    try {
      const parsed = JSON.parse(trimmed);

      // Check for common field names that might contain the actual content
      const possibleFields = ['HTML', 'html', 'Markdown', 'markdown', 'content', 'text', 'body'];

      for (const field of possibleFields) {
        if (parsed[field] && typeof parsed[field] === 'string') {
          const fieldValue = parsed[field].trim();

          // Verify the extracted content matches the expected format
          if (format === 'html' && /<[^>]+>/.test(fieldValue)) {
            return fieldValue;
          }
          if (format === 'markdown' && fieldValue.length > 10) {
            return fieldValue;
          }
        }
      }
    } catch {
      // Not JSON, continue with other cleanup methods
    }
  }

  // Remove common code block wrappers
  const codeBlockPattern = /^```[\w]*\s*\n?([\s\S]*?)\n?```$/;
  const codeBlockMatch = trimmed.match(codeBlockPattern);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Remove leading "text```" or similar patterns
  const leadingTextPattern = /^text\s*```\s*\n?/;
  let cleaned = trimmed.replace(leadingTextPattern, '');

  // Remove trailing JSON-like structures (e.g., '", "Summary": "...')
  // Find the first occurrence of `",` followed by a quote and a capital letter (likely a JSON key)
  const trailingJsonPattern = /",\s*"[A-Z][^"]*":/;
  const trailingMatch = cleaned.match(trailingJsonPattern);
  if (trailingMatch && trailingMatch.index) {
    cleaned = cleaned.substring(0, trailingMatch.index);
  }

  // Remove leading JSON object start with field name
  const leadingJsonPattern = /^\{\s*"[^"]+"\s*:\s*"/;
  if (leadingJsonPattern.test(cleaned)) {
    // Extract content between first quote pair
    const contentMatch = cleaned.match(/^\{\s*"[^"]+"\s*:\s*"([\s\S]*)$/);
    if (contentMatch) {
      cleaned = contentMatch[1];
    }
  }

  // Unescape common JSON escape sequences
  cleaned = cleaned
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');

  return cleaned.trim();
}
