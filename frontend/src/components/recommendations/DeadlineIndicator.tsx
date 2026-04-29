import React from 'react';
import clsx from 'clsx';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { getDaysRemaining, formatDate } from '../../utils/formatters';
import { getDeadlineColor } from '../../utils/colors';

interface DeadlineIndicatorProps {
  deadline: string;
  closedAt?: string;
  showDate?: boolean;
  size?: 'sm' | 'md';
}

export const DeadlineIndicator: React.FC<DeadlineIndicatorProps> = ({
  deadline,
  closedAt,
  showDate = true,
  size = 'sm',
}) => {
  if (closedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
        <CheckCircle size={12} />
        Clôturé le {formatDate(closedAt)}
      </span>
    );
  }

  const daysRemaining = getDaysRemaining(deadline);
  const colorClass = getDeadlineColor(daysRemaining);

  let label: string;
  let Icon = Clock;

  if (daysRemaining < 0) {
    label = `${Math.abs(daysRemaining)}j de retard`;
    Icon = AlertTriangle;
  } else if (daysRemaining === 0) {
    label = "Aujourd'hui";
    Icon = AlertTriangle;
  } else {
    label = `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}`;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={clsx(
          'inline-flex items-center gap-1 font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm',
          colorClass
        )}
      >
        <Icon size={size === 'sm' ? 11 : 13} />
        {label}
      </span>
      {showDate && (
        <span className="text-xs text-banking-muted">{formatDate(deadline)}</span>
      )}
    </div>
  );
};
