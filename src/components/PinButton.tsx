import React from 'react';
import { Pin, Globe } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';

interface PinButtonProps {
  flowId: string;
  currentPinLevel?: 'none' | 'user' | 'global'; // Optional: if provided, use this instead of getPinLevel
  className?: string;
}

export const PinButton: React.FC<PinButtonProps> = ({ flowId, currentPinLevel, className }) => {
  const { getPinLevel, togglePin } = useFlowStore();
  const pinLevel = currentPinLevel ?? getPinLevel(flowId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(flowId);
  };

  const iconConfig = {
    none: {
      icon: Pin,
      color: 'text-gray-400 hover:text-gray-600',
      tooltip: 'Pin for me',
    },
    user: {
      icon: Pin,
      color: 'text-red-500 hover:text-red-600',
      tooltip: 'Pin globally',
    },
    global: {
      icon: Globe,
      color: 'text-blue-500 hover:text-blue-600',
      tooltip: 'Unpin',
    }
  };

  const config = iconConfig[pinLevel];
  const Icon = config.icon;

  return (
    <button
      onClick={handleClick}
      className={`
        p-1.5 rounded-md transition-all duration-200
        ${config.color}
        hover:bg-gray-100
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        ${className}
      `}
      title={config.tooltip}
      aria-label={`Pin level: ${pinLevel}. ${config.tooltip}`}
      data-testid="pin-button"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
