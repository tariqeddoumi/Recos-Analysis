import React from 'react';
import clsx from 'clsx';
import { getProgressColor } from '../../utils/colors';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  labelPosition?: 'right' | 'inside';
  className?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'sm',
  showLabel = false,
  labelPosition = 'right',
  className,
  color,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color || getProgressColor(percentage);

  const heightClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('flex-1 rounded-full bg-gray-100 overflow-hidden', heightClasses[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && labelPosition === 'right' && (
        <span className="text-xs font-medium text-banking-muted w-8 text-right flex-shrink-0">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};
