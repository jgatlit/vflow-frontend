import type { NodeTypes } from '@xyflow/react';
import OpenAINode from './OpenAINode';
import AnthropicNode from './AnthropicNode';
import GeminiNode from './GeminiNode';
import PerplexityNode from './PerplexityNode';
import NotesNode from './NotesNode';
import PythonNode from './PythonNode';
import JavaScriptNode from './JavaScriptNode';
import ToolAugmentedLLMNode from './ToolAugmentedLLMNode';
import AgentNode from './AgentNode';
import WebhookInNode from './WebhookInNode';
import WebhookOutNode from './WebhookOutNode';
import MermaidNode from './MermaidNode';

export const nodeTypes: NodeTypes = {
  openai: OpenAINode,
  anthropic: AnthropicNode,
  gemini: GeminiNode,
  perplexity: PerplexityNode,
  notes: NotesNode,
  python: PythonNode,
  javascript: JavaScriptNode,
  'tool-augmented-llm': ToolAugmentedLLMNode,
  agent: AgentNode,
  'webhook-in': WebhookInNode,
  'webhook-out': WebhookOutNode,
  mermaid: MermaidNode,
};

export { OpenAINode, AnthropicNode, GeminiNode, PerplexityNode, NotesNode, PythonNode, JavaScriptNode, ToolAugmentedLLMNode, AgentNode, WebhookInNode, WebhookOutNode, MermaidNode };
