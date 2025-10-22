import type { WebhookConfig, WebhookOutNodeData, WebhookExecutionResult } from '../types/webhook';
import type { ExecutionResult } from '../utils/executionEngine';
import { substituteVariables, type ExecutionContext } from '../utils/executionEngine';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Webhook Service - API client for webhook operations
 */
export class WebhookService {
  /**
   * Get webhook configuration for a flow
   */
  static async getWebhookConfig(flowId: string): Promise<WebhookConfig | null> {
    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}/webhook/config`);

      if (response.status === 404) {
        return null; // No webhook configured
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch webhook config: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to fetch webhook config:', error);
      throw error;
    }
  }

  /**
   * Create or update webhook configuration
   */
  static async saveWebhookConfig(
    flowId: string,
    config: Partial<WebhookConfig>
  ): Promise<WebhookConfig> {
    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}/webhook/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save webhook config: ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to save webhook config:', error);
      throw error;
    }
  }

  /**
   * Regenerate webhook secret
   */
  static async regenerateSecret(flowId: string): Promise<WebhookConfig> {
    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}/webhook/secret`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate secret: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to regenerate secret:', error);
      throw error;
    }
  }

  /**
   * Generate webhook URL for a flow
   * IMPORTANT: Uses backend URL (API_URL) not frontend URL, since webhooks are handled by the backend
   */
  static generateWebhookUrl(flowId: string, customPath?: string, baseUrl?: string): string {
    const base = baseUrl || API_URL;
    const path = customPath || flowId;
    return `${base}/api/webhooks/${path}/trigger`;
  }

  /**
   * Generate cURL command for testing a webhook
   */
  static generateCurlCommand(webhookUrl: string, webhookSecret?: string): string {
    // Use single-line JSON (no pretty-printing) to avoid issues with newlines in bash
    const payload = JSON.stringify({ test: 'data', message: 'Hello from webhook' });

    if (!webhookSecret) {
      // Simple POST without signature
      return `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;
    }

    // cURL with HMAC signature generation
    return `# Generate HMAC signature
WEBHOOK_SECRET="${webhookSecret}"
PAYLOAD='${payload}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Send webhook request
curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-signature: sha256=$SIGNATURE" \\
  -d "$PAYLOAD"`;
  }

  /**
   * Execute outbound webhook (POST to external API)
   */
  static async executeOutboundWebhook(
    nodeData: WebhookOutNodeData,
    context: ExecutionContext,
    nodeId: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate target URL
      if (!nodeData.targetUrl) {
        throw new Error('Target URL is required');
      }

      // Substitute variables in URL
      const targetUrl = substituteVariables(nodeData.targetUrl, context);

      // Substitute variables in headers
      const headers: Record<string, string> = {};
      if (nodeData.headers) {
        for (const [key, value] of Object.entries(nodeData.headers)) {
          headers[key] = substituteVariables(value, context);
        }
      }

      // Add authentication header if configured
      if (nodeData.authType === 'bearer' && nodeData.authToken) {
        headers['Authorization'] = `Bearer ${substituteVariables(nodeData.authToken, context)}`;
      } else if (nodeData.authType === 'api-key' && nodeData.authToken) {
        headers['X-API-Key'] = substituteVariables(nodeData.authToken, context);
      }

      // Substitute variables in body template
      let body: string | undefined;
      if (nodeData.bodyTemplate && (nodeData.httpMethod === 'POST' || nodeData.httpMethod === 'PUT' || nodeData.httpMethod === 'PATCH')) {
        body = substituteVariables(nodeData.bodyTemplate, context);

        // Ensure Content-Type is set for POST/PUT/PATCH
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      // Configure timeout
      const timeoutMs = nodeData.timeoutMs || 30000; // Default 30s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Make the HTTP request
        const response = await fetch(targetUrl, {
          method: nodeData.httpMethod || 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const responseText = await response.text();

        // Parse response if JSON
        let output = responseText;
        try {
          const json = JSON.parse(responseText);
          output = JSON.stringify(json, null, 2);
        } catch {
          // Not JSON, use as-is
        }

        return {
          nodeId,
          output,
          executedAt: new Date().toISOString(),
          metadata: {
            statusCode: response.status,
            statusText: response.statusText,
            duration,
            targetUrl,
            httpMethod: nodeData.httpMethod || 'POST',
            outputVariable: nodeData.outputVariable || nodeId,
          },
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw fetchError;
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        nodeId,
        output: '',
        error: error.message || 'Webhook execution failed',
        executedAt: new Date().toISOString(),
        metadata: {
          duration,
          targetUrl: nodeData.targetUrl,
          httpMethod: nodeData.httpMethod || 'POST',
          outputVariable: nodeData.outputVariable || nodeId,
        },
      };
    }
  }

  /**
   * Test webhook trigger (for inbound webhooks)
   */
  static async testWebhookTrigger(flowId: string, payload: any): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/webhooks/${flowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook trigger failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to test webhook:', error);
      throw error;
    }
  }
}
