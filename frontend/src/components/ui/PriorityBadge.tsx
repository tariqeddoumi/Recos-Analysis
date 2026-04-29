import React from 'react';
import clsx from 'clsx';
import { PriorityLevel } from '../../types';
import { priorityColors } from '../../utils/colors';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const config = priorityColors[priority] || {
    bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: priority,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.label}
    </span>
  );
};
