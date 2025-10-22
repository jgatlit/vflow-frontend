import type { NodeTypes } from '@xyflow/react';
import OpenAINode from './OpenAINode';
import AnthropicNode from './AnthropicNode';
import GeminiNode from './GeminiNode';
import NotesNode from './NotesNode';
import PythonNode from './PythonNode';
import JavaScriptNode from './JavaScriptNode';
import ToolAugmentedLLMNode from './ToolAugmentedLLMNode';
import AgentNode from './AgentNode';
import WebhookInNode from './WebhookInNode';
import WebhookOutNode from './WebhookOutNode';

export const nodeTypes: NodeTypes = {
  openai: OpenAINode,
  anthropic: AnthropicNode,
  gemini: GeminiNode,
  notes: NotesNode,
  python: PythonNode,
  javascript: JavaScriptNode,
  'tool-augmented-llm': ToolAugmentedLLMNode,
  agent: AgentNode,
  'webhook-in': WebhookInNode,
  'webhook-out': WebhookOutNode,
};

export { OpenAINode, AnthropicNode, GeminiNode, NotesNode, PythonNode, JavaScriptNode, ToolAugmentedLLMNode, AgentNode, WebhookInNode, WebhookOutNode };
