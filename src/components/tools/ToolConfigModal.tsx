import { useState } from 'react';
import type { Tool } from '../../types/tools';

interface ToolConfigModalProps {
  tool: Tool;
  existingConfig?: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
  onClose: () => void;
}

// Tool-specific configuration schemas
const TOOL_CONFIG_SCHEMAS: Record<string, { fields: Array<{ key: string; label: string; type: string; placeholder?: string; required?: boolean; description?: string }> }> = {
  web_search: {
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your search API key',
        required: true,
        description: 'Required for web search functionality'
      },
      {
        key: 'maxResults',
        label: 'Max Results',
        type: 'number',
        placeholder: '10',
        required: false,
        description: 'Maximum number of search results (default: 10)'
      }
    ]
  },
  database_query: {
    fields: [
      {
        key: 'connectionString',
        label: 'Connection String',
        type: 'text',
        placeholder: 'postgresql://user:pass@host:port/db',
        required: true,
        description: 'Database connection string'
      },
      {
        key: 'maxRows',
        label: 'Max Rows',
        type: 'number',
        placeholder: '100',
        required: false,
        description: 'Maximum rows to return (default: 100)'
      }
    ]
  },
  email_sender: {
    fields: [
      {
        key: 'smtpHost',
        label: 'SMTP Host',
        type: 'text',
        placeholder: 'smtp.gmail.com',
        required: true,
        description: 'SMTP server hostname'
      },
      {
        key: 'smtpPort',
        label: 'SMTP Port',
        type: 'number',
        placeholder: '587',
        required: true,
        description: 'SMTP server port (usually 587 or 465)'
      },
      {
        key: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'your-email@example.com',
        required: true,
        description: 'SMTP username/email'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'App password or account password',
        required: true,
        description: 'SMTP password (use app-specific password for Gmail)'
      }
    ]
  }
};

export function ToolConfigModal({ tool, existingConfig, onSave, onClose }: ToolConfigModalProps) {
  const schema = TOOL_CONFIG_SCHEMAS[tool.id];
  const [config, setConfig] = useState<Record<string, any>>(existingConfig || {});

  if (!schema) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">{tool.icon} {tool.displayName}</h3>
          <p className="text-sm text-gray-600 mb-4">
            This tool does not require configuration.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // Validate required fields
    const missingFields = schema.fields
      .filter(field => field.required && !config[field.key])
      .map(field => field.label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">{tool.icon}</span>
            <span>Configure {tool.displayName}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6">{tool.description}</p>

        {/* Configuration Fields */}
        <div className="space-y-4">
          {schema.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-gray-500 mb-1">{field.description}</p>
              )}
              <input
                type={field.type}
                value={config[field.key] || ''}
                onChange={(e) => {
                  const value = field.type === 'number'
                    ? parseInt(e.target.value) || ''
                    : e.target.value;
                  setConfig({ ...config, [field.key]: value });
                }}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Security Note</p>
              <p>
                Configuration values are stored in the node data. For production use,
                consider using environment variables or a secure credential store.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
