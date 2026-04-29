import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 40,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label,
  fullPage = false,
}) => {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={40}
            className="animate-spin text-primary"
          />
          {label && <p className="text-sm text-banking-muted">{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center justify-center gap-2', className)}>
      <Loader2
        size={sizeMap[size]}
        className="animate-spin text-primary"
      />
      {label && <p className="text-sm text-banking-muted">{label}</p>}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={clsx(
                'h-4 rounded bg-gray-200',
                j === 0 ? 'w-24' : j === cols - 1 ? 'w-16' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse rounded-xl border border-banking-border bg-white p-6 shadow-card">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
};
