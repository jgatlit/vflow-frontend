import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import { PROVIDERS, type ProviderConfig, type ModelInfo } from '../config/models';

export interface ProviderModelPickerProps {
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  compact?: boolean;
  className?: string;
  allowProviderSwitch?: boolean; // For provider-locked nodes
}

export const ProviderModelPicker: FC<ProviderModelPickerProps> = ({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  compact = false,
  className = '',
  allowProviderSwitch = true
}) => {
  const [activeTab, setActiveTab] = useState(selectedProvider);
  const provider = PROVIDERS[activeTab];

  const handleProviderSwitch = (newProvider: string) => {
    if (!allowProviderSwitch) return;

    setActiveTab(newProvider);
    onProviderChange(newProvider);

    // Auto-select default model for new provider
    const defaultModel = PROVIDERS[newProvider].defaultModel;
    onModelChange(defaultModel);
  };

  // Group models by tier for better organization
  const modelsByTier = useMemo(() => {
    if (!provider) return {};

    const grouped: Record<string, ModelInfo[]> = {};
    provider.models.forEach(model => {
      if (!grouped[model.tier]) {
        grouped[model.tier] = [];
      }
      grouped[model.tier].push(model);
    });
    return grouped;
  }, [provider]);

  const tierOrder: Array<ModelInfo['tier']> = ['flagship', 'fast', 'premium', 'experimental', 'legacy'];
  const tierLabels = {
    flagship: 'Flagship',
    fast: 'Fast & Affordable',
    premium: 'Premium',
    experimental: 'Experimental',
    legacy: 'Legacy'
  };

  if (!provider) return null;

  return (
    <div className={`provider-model-picker ${className}`}>
      {/* Provider Tabs */}
      {allowProviderSwitch && (
        <div className="flex gap-1 mb-3 border-b border-gray-200">
          {Object.values(PROVIDERS).map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderSwitch(p.id)}
              className={`px-3 py-2 text-sm font-medium transition-all relative ${
                activeTab === p.id
                  ? `text-${p.color}-700 border-b-2 border-${p.color}-500 bg-${p.color}-50`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Model Selection - Grouped by Tier */}
      {compact ? (
        /* Compact View - Simple Dropdown */
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            {tierOrder.map(tier => {
              const models = modelsByTier[tier];
              if (!models || models.length === 0) return null;

              return (
                <optgroup key={tier} label={tierLabels[tier]}>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                      {model.pricing && model.pricing.input > 0
                        ? ` ($${model.pricing.input}/$${model.pricing.output})`
                        : ' (Free)'}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      ) : (
        /* Full View - Model Cards */
        <div className="space-y-3">
          {tierOrder.map(tier => {
            const models = modelsByTier[tier];
            if (!models || models.length === 0) return null;

            return (
              <div key={tier}>
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  {tierLabels[tier]}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {models.map(model => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      provider={provider}
                      selected={selectedModel === model.id}
                      onClick={() => onModelChange(model.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ModelCardProps {
  model: ModelInfo;
  provider: ProviderConfig;
  selected: boolean;
  onClick: () => void;
}

const ModelCard: FC<ModelCardProps> = ({ model, provider, selected, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className={`model-card p-3 rounded-lg border-2 text-left transition-all ${
        selected
          ? `border-${provider.color}-500 bg-${provider.color}-50`
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="font-semibold text-sm">{model.name}</div>
        {selected && (
          <span className="text-green-500 text-sm">✓</span>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-1 mb-2">
        <ModelTierBadge tier={model.tier} />
        {model.capabilities?.vision && <CapabilityBadge icon="👁️" title="Vision" />}
        {model.capabilities?.tools && <CapabilityBadge icon="🔧" title="Tools" />}
        {model.capabilities?.extendedThinking && <CapabilityBadge icon="🧠" title="Extended Thinking" />}
      </div>

      {model.description && (
        <div className="text-xs text-gray-600 mb-2">
          {model.description}
        </div>
      )}

      {model.pricing && (
        <div className="text-xs text-gray-500">
          {model.pricing.input === 0 && model.pricing.output === 0
            ? '💰 Free tier'
            : `💰 $${model.pricing.input}/$${model.pricing.output} per 1M tokens`
          }
        </div>
      )}

      {model.contextWindow && (
        <div className="text-xs text-gray-500 mt-1">
          📊 {(model.contextWindow / 1000).toFixed(0)}K context
        </div>
      )}
    </motion.button>
  );
};

interface ModelTierBadgeProps {
  tier: ModelInfo['tier'];
}

const ModelTierBadge: FC<ModelTierBadgeProps> = ({ tier }) => {
  const colors = {
    flagship: 'bg-blue-100 text-blue-700',
    fast: 'bg-green-100 text-green-700',
    premium: 'bg-purple-100 text-purple-700',
    experimental: 'bg-amber-100 text-amber-700',
    legacy: 'bg-gray-100 text-gray-700'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier]}`}>
      {tier}
    </span>
  );
};

interface CapabilityBadgeProps {
  icon: string;
  title: string;
}

const CapabilityBadge: FC<CapabilityBadgeProps> = ({ icon, title }) => {
  return (
    <span className="text-sm" title={title}>
      {icon}
    </span>
  );
};
