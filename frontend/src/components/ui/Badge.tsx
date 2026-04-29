import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'critical' | 'info';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  primary: 'bg-primary-100 text-primary-700 border border-primary-200',
  secondary: 'bg-blue-100 text-blue-700 border border-blue-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  danger: 'bg-red-100 text-red-700 border border-red-200',
  critical: 'bg-purple-100 text-purple-700 border border-purple-200',
  info: 'bg-teal-100 text-teal-700 border border-teal-200',
};

const dotColors = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  secondary: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  critical: 'bg-purple-500',
  info: 'bg-teal-500',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  dot = false,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
