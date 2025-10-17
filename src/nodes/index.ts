import type { NodeTypes } from '@xyflow/react';
import OpenAINode from './OpenAINode';
import AnthropicNode from './AnthropicNode';
import GeminiNode from './GeminiNode';
import NotesNode from './NotesNode';
import PythonNode from './PythonNode';
import JavaScriptNode from './JavaScriptNode';

export const nodeTypes: NodeTypes = {
  openai: OpenAINode,
  anthropic: AnthropicNode,
  gemini: GeminiNode,
  notes: NotesNode,
  python: PythonNode,
  javascript: JavaScriptNode,
};

export { OpenAINode, AnthropicNode, GeminiNode, NotesNode, PythonNode, JavaScriptNode };
