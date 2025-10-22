import type { Tool } from '../types/tools';

export const AVAILABLE_TOOLS: Tool[] = [
  // Search Tools
  {
    id: 'web_search',
    name: 'web_search',
    displayName: 'Web Search',
    icon: '🔍',
    description: 'Search the internet for current information',
    category: 'search',
    requiresConfig: true,
    status: 'needsConfig',
  },

  // Compute Tools
  {
    id: 'calculator',
    name: 'calculator',
    displayName: 'Calculator',
    icon: '🧮',
    description: 'Perform mathematical calculations',
    category: 'compute',
    requiresConfig: false,
    status: 'ready',
  },
  {
    id: 'code_interpreter',
    name: 'code_interpreter',
    displayName: 'Code Interpreter',
    icon: '💻',
    description: 'Execute Python code in a sandboxed environment',
    category: 'compute',
    requiresConfig: false,
    status: 'ready',
  },

  // Data Tools
  {
    id: 'file_read',
    name: 'file_read',
    displayName: 'File Read',
    icon: '📁',
    description: 'Read file contents from filesystem',
    category: 'data',
    requiresConfig: false,
    status: 'ready',
  },
  {
    id: 'file_write',
    name: 'file_write',
    displayName: 'File Write',
    icon: '💾',
    description: 'Write data to filesystem',
    category: 'data',
    requiresConfig: false,
    status: 'ready',
  },
  {
    id: 'database_query',
    name: 'database_query',
    displayName: 'Database Query',
    icon: '🗄️',
    description: 'Query databases using SQL',
    category: 'data',
    requiresConfig: true,
    status: 'needsConfig',
  },

  // Integration Tools
  {
    id: 'http_request',
    name: 'http_request',
    displayName: 'HTTP Request',
    icon: '🌐',
    description: 'Make HTTP GET/POST requests',
    category: 'integration',
    requiresConfig: false,
    status: 'ready',
  },
  {
    id: 'email_sender',
    name: 'email_sender',
    displayName: 'Email Sender',
    icon: '📧',
    description: 'Send emails via SMTP',
    category: 'integration',
    requiresConfig: true,
    status: 'needsConfig',
  },
];

// Knowledge tools that connect on the left side
export const KNOWLEDGE_TOOLS = ['file_read', 'database_query'];
