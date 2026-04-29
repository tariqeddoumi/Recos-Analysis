import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataBySource } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { BarChart2 } from 'lucide-react';

interface ChartBySourceProps {
  data: ChartDataBySource[];
  isLoading?: boolean;
}

export const ChartBySource: React.FC<ChartBySourceProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-banking-text">Recommandations par source</h2>
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
          <h2 className="text-sm font-semibold text-banking-text">Recommandations par source</h2>
        </CardHeader>
        <EmptyState compact />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-banking-text">Recommandations par source</h2>
        </div>
      </CardHeader>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
            <Bar dataKey="open" name="Ouvertes" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="closed" name="Clôturées" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="overdue" name="En retard" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
