import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataByStatus } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { PieChart as PieIcon } from 'lucide-react';
import { CHART_COLORS } from '../../utils/colors';

interface ChartByStatusProps {
  data: ChartDataByStatus[];
  isLoading?: boolean;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  draft: CHART_COLORS.draft,
  open: CHART_COLORS.open,
  in_progress: CHART_COLORS.in_progress,
  pending_validation: CHART_COLORS.pending_validation,
  validated: CHART_COLORS.validated,
  closed: CHART_COLORS.closed,
  rejected: CHART_COLORS.rejected,
  overdue: CHART_COLORS.overdue,
};

export const ChartByStatus: React.FC<ChartByStatusProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-banking-text">Répartition par statut</h2>
        </CardHeader>
        <div className="mt-4 h-64 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-banking-text">Répartition par statut</h2>
        </CardHeader>
        <EmptyState compact />
      </Card>
    );
  }

  const filtered = data.filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieIcon size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-banking-text">Répartition par statut</h2>
        </div>
      </CardHeader>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
            >
              {filtered.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLOR_MAP[entry.status] || '#94a3b8'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
              formatter={(value: number, _name: string, props: { payload?: { percentage?: number } }) => [
                `${value} (${props.payload?.percentage?.toFixed(1)}%)`,
                props.payload as unknown as string,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
