import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { DashboardMyTasks } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { getDeadlineColor } from '../../utils/colors';
import { formatDate } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';
import clsx from 'clsx';

interface DeadlineCalendarProps {
  tasks?: DashboardMyTasks;
  isLoading?: boolean;
}

export const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ tasks, isLoading }) => {
  const navigate = useNavigate();

  const deadlines = tasks?.upcoming_deadlines?.slice(0, 8) || [];

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-banking-border">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-warning" />
          <h2 className="text-sm font-semibold text-banking-text">Prochaines échéances</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : deadlines.length === 0 ? (
        <EmptyState
          title="Aucune échéance proche"
          description="Toutes vos échéances sont à plus de 30 jours."
          compact
        />
      ) : (
        <ul className="divide-y divide-banking-border">
          {deadlines.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() =>
                navigate(
                  item.type === 'recommendation'
                    ? `/recommendations/${item.id}`
                    : `/action-plans/${item.id}`
                )
              }
            >
              <div
                className={clsx(
                  'flex-shrink-0 h-2 w-2 rounded-full',
                  item.days_remaining < 0
                    ? 'bg-red-500'
                    : item.days_remaining <= 7
                    ? 'bg-orange-500'
                    : item.days_remaining <= 30
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-banking-text truncate">{item.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-banking-muted capitalize">
                    {item.type === 'recommendation' ? 'Recommandation' : "Plan d'action"}
                  </span>
                  <span className="text-xs text-banking-muted">•</span>
                  <span className="text-xs text-banking-muted">{formatDate(item.deadline)}</span>
                </div>
              </div>
              <span
                className={clsx(
                  'flex-shrink-0 text-xs font-semibold',
                  getDeadlineColor(item.days_remaining)
                )}
              >
                {item.days_remaining < 0
                  ? `${Math.abs(item.days_remaining)}j retard`
                  : item.days_remaining === 0
                  ? "Aujourd'hui"
                  : `${item.days_remaining}j`}
              </span>
              <ArrowRight size={14} className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
