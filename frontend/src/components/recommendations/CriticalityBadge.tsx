import React from 'react';
import clsx from 'clsx';
import { CriticalityClass } from '../../types';
import { criticalityColors } from '../../utils/colors';

interface CriticalityBadgeProps {
  score: number;
  criticalityClass: CriticalityClass;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

export const CriticalityBadge: React.FC<CriticalityBadgeProps> = ({
  score,
  criticalityClass,
  showScore = true,
  size = 'sm',
}) => {
  const config = criticalityColors[criticalityClass];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.bg,
        config.text
      )}
    >
      {showScore && (
        <span
          className={clsx(
            'inline-flex h-4 w-4 items-center justify-center rounded-full text-white',
            config.score,
            size === 'md' && 'h-5 w-5'
          )}
        >
          {score}
        </span>
      )}
      {config.label}
    </span>
  );
};
