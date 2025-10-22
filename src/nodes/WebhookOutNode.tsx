import { memo, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import type { WebhookOutNodeData } from '../types/webhook';
import { Plus, X, Eye, EyeOff } from 'lucide-react';

const WebhookOutNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as WebhookOutNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const [showToken, setShowToken] = useState(false);
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const handleDataChange = (field: keyof WebhookOutNodeData, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  const handleAddHeader = () => {
    if (!newHeaderKey.trim()) return;

    const headers = { ...(nodeData.headers || {}) };
    headers[newHeaderKey.trim()] = newHeaderValue.trim();

    handleDataChange('headers', headers);
    setNewHeaderKey('');
    setNewHeaderValue('');
  };

  const handleRemoveHeader = (key: string) => {
    const headers = { ...(nodeData.headers || {}) };
    delete headers[key];
    handleDataChange('headers', headers);
  };

  const maskToken = (token: string) => {
    if (!token) return '';
    return '•'.repeat(Math.min(token.length, 32));
  };

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
  const authTypes = [
    { value: 'none', label: 'None' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api-key', label: 'API Key' },
  ] as const;

  return (
    <>
      <NodeResizer minWidth={400} minHeight={400} isVisible={selected} />

      <div className={`bg-white rounded-lg shadow-lg border-2 border-orange-400 p-4 min-w-[400px] ${
        nodeData.bypassed ? 'opacity-60 ring-2 ring-gray-400' : ''
      }`}>
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📤</span>
            <input
              type="text"
              value={nodeData.title || 'Webhook Outbound'}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className="font-semibold text-lg border-none outline-none flex-1"
              placeholder="Webhook Outbound"
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

        {/* Target URL */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target URL
          </label>
          <input
            type="text"
            value={nodeData.targetUrl || ''}
            onChange={(e) => handleDataChange('targetUrl', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="https://api.example.com/endpoint"
          />
        </div>

        {/* HTTP Method */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTTP Method
          </label>
          <div className="flex gap-2 flex-wrap">
            {httpMethods.map((method) => (
              <button
                key={method}
                onClick={() => handleDataChange('httpMethod', method)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  (nodeData.httpMethod || 'POST') === method
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Headers */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Headers
          </label>

          {/* Existing Headers */}
          {nodeData.headers && Object.entries(nodeData.headers).length > 0 && (
            <div className="mb-2 space-y-1">
              {Object.entries(nodeData.headers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-600 min-w-[100px]">{key}:</span>
                  <span className="font-mono text-gray-800 flex-1 truncate">{value}</span>
                  <button
                    onClick={() => handleRemoveHeader(key)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Header */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              placeholder="Header Key"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              type="text"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              placeholder="Header Value"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleAddHeader}
              disabled={!newHeaderKey.trim()}
              className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Template (for POST/PUT/PATCH) */}
        {(nodeData.httpMethod === 'POST' || nodeData.httpMethod === 'PUT' || nodeData.httpMethod === 'PATCH' || !nodeData.httpMethod) && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body Template
            </label>
            <textarea
              value={nodeData.bodyTemplate || ''}
              onChange={(e) => handleDataChange('bodyTemplate', e.target.value)}
              className="w-full min-h-[100px] px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
              placeholder={'{\n  "message": "{{input}}",\n  "timestamp": "{{timestamp}}"\n}'}
            />
            <div className="text-xs text-gray-500 mt-1">
              Use {'{{'} and {'}}'}  for variable substitution
            </div>
          </div>
        )}

        {/* Authentication */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Authentication
          </label>

          {/* Auth Type Selection */}
          <select
            value={nodeData.authType || 'none'}
            onChange={(e) => handleDataChange('authType', e.target.value as any)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2"
          >
            {authTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Auth Token Input */}
          {nodeData.authType && nodeData.authType !== 'none' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={showToken ? (nodeData.authToken || '') : maskToken(nodeData.authToken || '')}
                onChange={(e) => handleDataChange('authToken', e.target.value)}
                className="flex-1 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={nodeData.authType === 'bearer' ? 'Bearer token...' : 'API key...'}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={showToken ? 'Hide' : 'Show'}
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Advanced Settings
          </label>

          {/* Retry Configuration */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Retry Count</label>
              <input
                type="number"
                value={nodeData.retryCount ?? 3}
                onChange={(e) => handleDataChange('retryCount', parseInt(e.target.value))}
                min="0"
                max="10"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Retry Delay (ms)</label>
              <input
                type="number"
                value={nodeData.retryDelayMs ?? 1000}
                onChange={(e) => handleDataChange('retryDelayMs', parseInt(e.target.value))}
                min="100"
                max="60000"
                step="100"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Request Timeout (ms)</label>
            <input
              type="number"
              value={nodeData.timeoutMs ?? 30000}
              onChange={(e) => handleDataChange('timeoutMs', parseInt(e.target.value))}
              min="1000"
              max="300000"
              step="1000"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Last Response Status */}
        {nodeData.lastResponseStatus && (
          <div className="mb-3 text-xs text-gray-500">
            Last Response: {nodeData.lastResponseStatus}{' '}
            {nodeData.lastResponseTime && `at ${new Date(nodeData.lastResponseTime).toLocaleString()}`}
          </div>
        )}

        {/* Footer - Output Variable */}
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1 flex-wrap">
          <span>Reference using</span>
          <span className="font-mono">{'{{'}</span>
          <input
            type="text"
            value={nodeData.outputVariable || id}
            onChange={(e) => handleDataChange('outputVariable', e.target.value)}
            className="bg-white px-1 py-0.5 rounded border border-orange-300 font-mono min-w-[4ch] focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder={id}
            style={{ width: `${Math.max(4, (nodeData.outputVariable || id).length)}ch` }}
          />
          <span className="font-mono">{'}}'}</span>
        </div>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-orange-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-orange-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{ zIndex: 10 }}
      />
    </>
  );
});

WebhookOutNode.displayName = 'WebhookOutNode';

export default WebhookOutNode;
