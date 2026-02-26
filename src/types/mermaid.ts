/**
 * Mermaid Node Type Definitions
 * Defines data structures for the MermaidNode component
 */

export type MermaidOperation = 'render' | 'parse' | 'detect' | 'extract' | 'batch';
export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral' | 'base';
export type MermaidInputMode = 'editor' | 'upstream' | 'auto';

/**
 * Mermaid preset configuration
 */
export interface MermaidPreset {
  name: string;
  diagram: string;
  operation: string;
  theme: string;
  config: Record<string, any>;
  builtIn: boolean;
}

/**
 * Main data structure for MermaidNode
 */
export interface MermaidNodeData {
  // Core fields
  title: string;
  outputVariable: string;
  bypassed: boolean;

  // Diagram configuration
  diagram: string;
  inputMode: MermaidInputMode;
  operation: MermaidOperation;
  theme: MermaidTheme;
  outputFormat: 'svg-string';
  config: Record<string, any>;

  // Preset management
  activePreset: string | null;
  presets: MermaidPreset[];
  presetSelector: string;

  // UI state
  showPreview: boolean;
  previewSvg: string | null;
  previewError: string | null;
  editorCollapsed: boolean;
}
