import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Recommendation } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { CriticalityBadge } from '../recommendations/CriticalityBadge';
import { DeadlineIndicator } from '../recommendations/DeadlineIndicator';
import { ProgressBar } from '../ui/ProgressBar';
import { truncateText } from '../../utils/formatters';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

interface CriticalTableProps {
  data: Recommendation[];
  isLoading?: boolean;
}

export const CriticalTable: React.FC<CriticalTableProps> = ({ data, isLoading }) => {
  const navigate = useNavigate();

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-banking-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-banking-text">
              Recommandations critiques (Top 10)
            </h2>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate('/recommendations?priority=critical')}
            rightIcon={<ExternalLink size={12} />}
          >
            Voir tout
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6">
          <LoadingSpinner label="Chargement..." />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Aucune recommandation critique"
          description="Il n'y a pas de recommandations critiques actuellement."
          compact
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-banking-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Constat
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Criticité
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase tracking-wider">
                  Avancement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-banking-border">
              {data.map((rec, index) => (
                <tr
                  key={rec.id}
                  onClick={() => navigate(`/recommendations/${rec.id}`)}
                  className={`cursor-pointer hover:bg-primary-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="px-4 py-3 text-xs font-mono font-medium text-primary">
                    {rec.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-banking-text max-w-48">
                    {truncateText(rec.constat, 60)}
                  </td>
                  <td className="px-4 py-3">
                    <CriticalityBadge
                      score={rec.risk_qualification?.criticality_score}
                      criticalityClass={rec.risk_qualification?.criticality_class}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DeadlineIndicator
                      deadline={rec.effective_deadline}
                      closedAt={rec.closure_date}
                    />
                  </td>
                  <td className="px-4 py-3 w-28">
                    <ProgressBar value={rec.progress_rate} showLabel size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
