/**
 * Secret Scanning Utility
 *
 * Scans workflow exports for potential hardcoded secrets and API keys.
 */

import type { WorkflowExport } from '../types/workflow-export';

/**
 * Common API key and secret patterns
 */
const SECRET_PATTERNS = [
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{32,}/g,
  },
  {
    name: 'OpenAI Project API Key',
    pattern: /sk-proj-[a-zA-Z0-9_-]{32,}/g,
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z0-9_-]{32,}/g,
  },
  {
    name: 'Google API Key',
    pattern: /AIza[a-zA-Z0-9_-]{35}/g,
  },
  {
    name: 'Slack Token',
    pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g,
  },
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
  },
  {
    name: 'GitHub OAuth Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
  },
  {
    name: 'Stripe Test Key',
    pattern: /sk_test_[a-zA-Z0-9]{24,}/g,
  },
  {
    name: 'Twilio API Key',
    pattern: /SK[a-z0-9]{32}/g,
  },
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
  },
  {
    name: 'Bearer Token',
    pattern: /Bearer [a-zA-Z0-9_\-\.=]{20,}/g,
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  },
];

/**
 * Secret match result
 */
export interface SecretMatch {
  type: string;
  value: string;
  location: string;
  redacted: string;
}

/**
 * Scan workflow for potential secrets
 */
export function scanForSecrets(workflow: WorkflowExport): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const json = JSON.stringify(workflow, null, 2);

  for (const { name, pattern } of SECRET_PATTERNS) {
    const found = json.matchAll(pattern);
    for (const match of found) {
      const value = match[0];
      matches.push({
        type: name,
        value,
        location: findSecretLocation(workflow, value),
        redacted: redactSecret(value),
      });
    }
  }

  return matches;
}

/**
 * Find location of secret in workflow
 */
function findSecretLocation(workflow: WorkflowExport, secret: string): string {
  // Check nodes
  for (const node of workflow.flow.nodes) {
    const nodeJson = JSON.stringify(node.data);
    if (nodeJson.includes(secret)) {
      return `Node ${node.id} (${node.type || 'unknown'})`;
    }
  }

  // Check metadata
  const metaJson = JSON.stringify(workflow.meta);
  if (metaJson.includes(secret)) {
    return 'Workflow metadata';
  }

  // Check settings
  const settingsJson = JSON.stringify(workflow.settings);
  if (settingsJson.includes(secret)) {
    return 'Workflow settings';
  }

  // Check variables
  if (workflow.variables) {
    const varsJson = JSON.stringify(workflow.variables);
    if (varsJson.includes(secret)) {
      return 'Workflow variables';
    }
  }

  return 'Unknown location';
}

/**
 * Redact secret value for display
 */
function redactSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length);
  }

  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 4);
  const middle = '*'.repeat(Math.min(secret.length - 8, 20));

  return `${start}${middle}${end}`;
}

/**
 * Check if workflow is safe to export
 */
export function isSafeToExport(workflow: WorkflowExport): {
  safe: boolean;
  secrets: SecretMatch[];
  warnings: string[];
} {
  const secrets = scanForSecrets(workflow);
  const warnings: string[] = [];

  if (secrets.length > 0) {
    warnings.push(
      `Found ${secrets.length} potential secret(s) in the workflow. ` +
        'Please remove sensitive data before exporting.'
    );
  }

  // Additional checks
  const credentialCount = workflow.credentials.length;
  if (credentialCount > 0) {
    warnings.push(
      `This workflow references ${credentialCount} credential(s). ` +
        'Credential values are not exported, only references.'
    );
  }

  return {
    safe: secrets.length === 0,
    secrets,
    warnings,
  };
}

/**
 * Get secret type description
 */
export function getSecretTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'OpenAI API Key': 'OpenAI API key (starts with sk-)',
    'Anthropic API Key': 'Anthropic Claude API key (starts with sk-ant-)',
    'Google API Key': 'Google Cloud/Gemini API key',
    'AWS Access Key': 'AWS access key ID',
    'Bearer Token': 'HTTP Bearer authentication token',
    'JWT Token': 'JSON Web Token',
  };

  return descriptions[type] || 'Potential secret or API key';
}
