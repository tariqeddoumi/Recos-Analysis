import React from 'react';
import clsx from 'clsx';

interface TimelineItem {
  id: number | string;
  title: string;
  description?: string;
  date: string;
  icon?: React.ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const colorClasses = {
  default: 'bg-gray-400 ring-gray-100',
  primary: 'bg-primary ring-primary-100',
  success: 'bg-accent ring-green-100',
  warning: 'bg-warning ring-yellow-100',
  danger: 'bg-danger ring-red-100',
};

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={clsx('flow-root', className)}>
      <ul className="-mb-8">
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {index < items.length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex gap-4">
                <div>
                  <span
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-full ring-4',
                      colorClasses[item.color || 'default']
                    )}
                  >
                    {item.icon ? (
                      <span className="text-white">{item.icon}</span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-banking-text">{item.title}</p>
                    <time className="flex-shrink-0 text-xs text-banking-muted">{item.date}</time>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
