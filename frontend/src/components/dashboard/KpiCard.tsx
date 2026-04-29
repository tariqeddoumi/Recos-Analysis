import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/Card';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'critical';
  onClick?: () => void;
  className?: string;
}

const variantConfig = {
  default: {
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary',
    valueColor: 'text-banking-text',
  },
  primary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-secondary',
    valueColor: 'text-secondary',
  },
  success: {
    iconBg: 'bg-green-50',
    iconColor: 'text-accent',
    valueColor: 'text-accent',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-warning',
    valueColor: 'text-warning',
  },
  danger: {
    iconBg: 'bg-red-50',
    iconColor: 'text-danger',
    valueColor: 'text-danger',
  },
  critical: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-critical',
    valueColor: 'text-critical',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  onClick,
  className,
}) => {
  const config = variantConfig[variant];

  return (
    <Card hover={!!onClick} onClick={onClick} className={clsx('cursor-pointer', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-banking-muted uppercase tracking-wide truncate">
            {title}
          </p>
          <p className={clsx('mt-2 text-2xl font-bold', config.valueColor)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-banking-muted">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend.value > 0 ? (
                <TrendingUp size={12} className="text-green-500" />
              ) : trend.value < 0 ? (
                <TrendingDown size={12} className="text-red-500" />
              ) : (
                <Minus size={12} className="text-gray-400" />
              )}
              <span
                className={clsx(
                  'text-xs font-medium',
                  trend.value > 0
                    ? 'text-green-600'
                    : trend.value < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
                )}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%{trend.label ? ` ${trend.label}` : ''}
              </span>
            </div>
          )}
        </div>
        <div
          className={clsx(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
            config.iconBg,
            config.iconColor
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
