/**
 * Webhook type definitions for Visual Flow
 * Matches backend webhook implementation
 */

export interface WebhookInNodeData {
  title?: string;
  flowId?: string;
  webhookUrl?: string;        // Generated URL (read-only)
  webhookSecret?: string;     // Shared secret for HMAC signatures
  customPath?: string;        // Optional custom webhook path (instead of default flowId)
  isEnabled?: boolean;
  maxRequestsPerMinute?: number;
  allowedIPs?: string[];
  requireSignature?: boolean;
  lastTriggeredAt?: string;
  triggerCount?: number;
  outputVariable?: string;
  compactMode?: boolean;
  bypassed?: boolean;         // true = skip execution, false = normal execution
}

export interface WebhookOutNodeData {
  title?: string;
  targetUrl?: string;         // External API endpoint
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  bodyTemplate?: string;      // JSON template with {{variables}}
  authType?: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  lastResponseStatus?: number;
  lastResponseTime?: string;
  outputVariable?: string;
  compactMode?: boolean;
  bypassed?: boolean;         // true = skip execution, false = normal execution
}

export interface WebhookConfig {
  flowId: string;
  webhookUrl: string;
  webhookSecret: string;
  enabled: boolean;
  maxRequestsPerMinute: number;
  allowedIPs: string[];
  requireSignature: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookExecutionResult {
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  duration: number;
  error?: string;
}
