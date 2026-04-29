import React from 'react';
import { Inbox } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Aucun résultat',
  description = 'Aucune donnée à afficher pour le moment.',
  icon,
  action,
  className,
  compact = false,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        {icon || <Inbox size={28} className="text-gray-400" />}
      </div>
      <h3 className="mb-1 text-base font-semibold text-banking-text">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-banking-muted">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
