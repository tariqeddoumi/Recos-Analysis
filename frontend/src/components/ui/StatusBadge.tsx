import React from 'react';
import clsx from 'clsx';
import { RecommendationStatus, ActionStatus, EvidenceStatus } from '../../types';
import { statusColors, actionStatusColors, evidenceStatusColors } from '../../utils/colors';

interface StatusBadgeProps {
  status: string;
  type?: 'recommendation' | 'action' | 'evidence';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'recommendation',
  size = 'sm',
}) => {
  let colorConfig: { bg: string; text: string; border: string; label: string };

  if (type === 'action') {
    colorConfig = actionStatusColors[status as ActionStatus] || {
      bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: status,
    };
  } else if (type === 'evidence') {
    colorConfig = evidenceStatusColors[status as EvidenceStatus] || {
      bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: status,
    };
  } else {
    colorConfig = statusColors[status as RecommendationStatus] || {
      bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: status,
    };
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorConfig.bg,
        colorConfig.text,
        colorConfig.border
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {colorConfig.label}
    </span>
  );
};
