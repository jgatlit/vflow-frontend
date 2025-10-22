import { useState, useEffect } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import type { WebhookInNodeData } from '../types/webhook';
import { WebhookService } from '../services/webhookService';
import { Copy, RefreshCw, Eye, EyeOff, Check, Terminal } from 'lucide-react';

const WebhookInNode = ({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as WebhookInNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const currentFlowId = useFlowStore((state) => state.currentFlowId);

  // DEBUG: Log every render
  console.log('[WebhookInNode] RENDER', {
    nodeId: id,
    currentFlowId,
    'nodeData.flowId': nodeData.flowId,
    'nodeData.webhookUrl': nodeData.webhookUrl,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDataChange = (field: keyof WebhookInNodeData, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  // Generate webhook URL when currentFlowId or customPath changes
  useEffect(() => {
    console.log('[WebhookInNode] useEffect triggered', {
      currentFlowId,
      'nodeData.flowId': nodeData.flowId,
      'nodeData.customPath': nodeData.customPath,
      'nodeData.webhookUrl': nodeData.webhookUrl,
      nodeId: id,
    });

    if (currentFlowId) {
      // Check if we need to update the webhook URL
      const expectedUrl = WebhookService.generateWebhookUrl(currentFlowId, nodeData.customPath);
      console.log('[WebhookInNode] Expected URL:', expectedUrl);

      if (nodeData.flowId !== currentFlowId || nodeData.webhookUrl !== expectedUrl) {
        console.log('[WebhookInNode] Updating node data with URL');
        // Flow ID changed or URL doesn't match - update it
        updateNodeData(id, {
          flowId: currentFlowId,
          webhookUrl: expectedUrl,
        });
      } else {
        console.log('[WebhookInNode] URL already matches, no update needed');
      }
    } else {
      console.log('[WebhookInNode] No currentFlowId - waiting for flow to be saved');
    }
  }, [currentFlowId, nodeData.flowId, nodeData.customPath, nodeData.webhookUrl, id, updateNodeData]);

  // Load webhook config from backend if flowId is set
  useEffect(() => {
    if (nodeData.flowId && !nodeData.webhookSecret) {
      loadWebhookConfig();
    }
  }, [nodeData.flowId]);

  const loadWebhookConfig = async () => {
    if (!nodeData.flowId) return;

    try {
      setIsLoading(true);
      const config = await WebhookService.getWebhookConfig(nodeData.flowId);

      if (config) {
        updateNodeData(id, {
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookSecret,
          isEnabled: config.enabled,
          maxRequestsPerMinute: config.maxRequestsPerMinute,
          allowedIPs: config.allowedIPs,
          requireSignature: config.requireSignature,
          lastTriggeredAt: config.lastTriggeredAt,
          triggerCount: config.triggerCount,
        });
      }
    } catch (error) {
      console.error('Failed to load webhook config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (nodeData.webhookUrl) {
      await navigator.clipboard.writeText(nodeData.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCurl = async () => {
    if (nodeData.webhookUrl) {
      const curlCommand = WebhookService.generateCurlCommand(
        nodeData.webhookUrl,
        nodeData.webhookSecret
      );
      await navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!nodeData.flowId) return;

    if (!confirm('Are you sure you want to regenerate the webhook secret? The old secret will no longer work.')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await WebhookService.regenerateSecret(nodeData.flowId);

      // Backend returns { success: true, config: { ...actualConfig } }
      if (response && response.config && response.config.secret) {
        updateNodeData(id, {
          webhookSecret: response.config.secret, // Backend field is 'secret', not 'webhookSecret'
        });
        alert('Secret regenerated successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
      alert('Failed to regenerate secret. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    console.log('[handleSaveConfig] Called', { flowId: nodeData.flowId });
    if (!nodeData.flowId) {
      console.log('[handleSaveConfig] No flowId - aborting');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[handleSaveConfig] Saving webhook config...', {
        enabled: nodeData.isEnabled ?? true,
        maxRequestsPerMinute: nodeData.maxRequestsPerMinute ?? 60,
        requireSignature: nodeData.requireSignature ?? true,
      });

      const savedConfig = await WebhookService.saveWebhookConfig(nodeData.flowId, {
        enabled: nodeData.isEnabled ?? true,
        maxRequestsPerMinute: nodeData.maxRequestsPerMinute ?? 60,
        allowedIPs: nodeData.allowedIPs ?? [],
        requireSignature: nodeData.requireSignature ?? true,
      });

      console.log('[handleSaveConfig] Received config from backend:', savedConfig);

      // Update node with the returned config (includes the generated secret)
      // Backend returns { success: true, config: { ...actualConfig }, webhookUrl: "..." }
      if (savedConfig && savedConfig.config) {
        const config = savedConfig.config;
        console.log('[handleSaveConfig] Updating node with config:', config);
        updateNodeData(id, {
          webhookSecret: config.secret, // Backend field is 'secret', not 'webhookSecret'
          isEnabled: config.enabled,
          maxRequestsPerMinute: config.maxRequestsPerMinute,
          allowedIPs: config.allowedIPs || [],
          requireSignature: config.requireSignature,
        });
      }

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskSecret = (secret: string) => {
    if (!secret) return '';
    return '•'.repeat(Math.min(secret.length, 32));
  };

  return (
    <>
      <NodeResizer minWidth={350} minHeight={300} isVisible={selected} />

      <div className={`bg-white rounded-lg shadow-lg border-2 border-blue-400 p-4 min-w-[350px] ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🪝</span>
            <input
              type="text"
              value={nodeData.title || 'Webhook Inbound'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg border-none outline-none flex-1"
              placeholder="Webhook Inbound"
            />
            <button
              onClick={() => handleDataChange('bypassed', !nodeData.bypassed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                nodeData.bypassed
                  ? 'bg-gray-400 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={nodeData.bypassed ? 'Node is bypassed - click to activate' : 'Node is active - click to bypass'}
            >
              {nodeData.bypassed ? '⏸ Bypassed' : '▶ Active'}
            </button>
          </div>
          <div className="text-xs text-gray-500">ID: {id}</div>
        </div>

        {/* Webhook URL */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={nodeData.webhookUrl || ''}
              readOnly
              className="flex-1 text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-300"
              placeholder="Generating..."
            />
            <button
              onClick={handleCopyUrl}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Copy URL"
              disabled={!nodeData.webhookUrl}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleCopyCurl}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Copy cURL command"
              disabled={!nodeData.webhookUrl}
            >
              {copiedCurl ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Terminal className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Custom Path Input */}
          <div>
            <input
              type="text"
              value={nodeData.customPath || ''}
              onChange={(e) => handleDataChange('customPath', e.target.value)}
              className="w-full text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Custom path (optional)"
            />
            {nodeData.customPath && (
              <div className="text-xs text-gray-500 mt-1">
                Preview: /api/webhooks/{nodeData.customPath}/trigger
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nodeData.isEnabled ?? true}
                onChange={(e) => handleDataChange('isEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>

          {nodeData.lastTriggeredAt && (
            <div className="text-xs text-gray-500">
              Last Triggered: {new Date(nodeData.lastTriggeredAt).toLocaleString()}
            </div>
          )}
          {nodeData.triggerCount !== undefined && (
            <div className="text-xs text-gray-500">
              Trigger Count: {nodeData.triggerCount}
            </div>
          )}
        </div>

        {/* Security Configuration */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security
          </label>

          {/* Secret */}
          <div className="mb-2">
            <div className="text-xs text-gray-600 mb-1">Webhook Secret</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={showSecret ? (nodeData.webhookSecret || '') : maskSecret(nodeData.webhookSecret || '')}
                readOnly
                className="flex-1 text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-300"
                placeholder="Not configured"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={showSecret ? 'Hide' : 'Show'}
                disabled={!nodeData.webhookSecret}
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={handleRegenerateSecret}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Regenerate Secret"
                disabled={isLoading || !nodeData.flowId}
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Require Signature */}
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={nodeData.requireSignature ?? true}
              onChange={(e) => handleDataChange('requireSignature', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">Require HMAC Signature</span>
          </label>
        </div>

        {/* Rate Limiting */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Requests/Minute
          </label>
          <input
            type="number"
            value={nodeData.maxRequestsPerMinute ?? 60}
            onChange={(e) => handleDataChange('maxRequestsPerMinute', parseInt(e.target.value))}
            min="1"
            max="1000"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Save Configuration Button */}
        <div className="mb-3">
          <button
            onClick={handleSaveConfig}
            disabled={isLoading || !nodeData.flowId}
            className="w-full px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Footer - Output Variable */}
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1 flex-wrap">
          <span>Reference using</span>
          <span className="font-mono">{'{{'}</span>
          <input
            type="text"
            value={nodeData.outputVariable || id}
            onChange={(e) => handleDataChange('outputVariable', e.target.value)}
            className="bg-white px-1 py-0.5 rounded border border-blue-300 font-mono min-w-[4ch] focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={id}
            style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
          />
          <span className="font-mono">{'}}'}</span>
        </div>
      </div>

      {/* Connection Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
};

WebhookInNode.displayName = 'WebhookInNode';

export default WebhookInNode;
