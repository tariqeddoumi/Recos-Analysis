import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { statusColors } from '../../utils/colors';
import { RecommendationStatus } from '../../types';
import clsx from 'clsx';

export const WorkflowConfig: React.FC = () => {
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['workflow-steps'],
    queryFn: () => adminService.getWorkflowSteps(),
  });

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-banking-text">Configuration du workflow</h1>
        <p className="text-sm text-banking-muted">Gestion des transitions de statuts</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-banking-text">Flux de validation</h2>
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-banking-muted">Aucune configuration workflow trouvée</p>
        ) : (
          <div className="space-y-4">
            {steps
              .sort((a, b) => a.order - b.order)
              .map((step) => {
                const config = statusColors[step.status as RecommendationStatus];
                return (
                  <div key={step.id} className="flex items-start gap-4 p-4 rounded-xl border border-banking-border">
                    <div className={clsx(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                      config?.bg, config?.text
                    )}>
                      {step.order}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-banking-text">{step.label}</p>
                        {step.is_terminal && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Terminal</span>
                        )}
                        {step.required_role && (
                          <span className="text-xs bg-primary-100 text-primary px-2 py-0.5 rounded-full">
                            Rôle requis: {step.required_role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-banking-muted">{step.status}</p>
                      {step.allowed_transitions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-banking-muted">Transitions vers:</span>
                          {step.allowed_transitions.map((t) => {
                            const tc = statusColors[t as RecommendationStatus];
                            return (
                              <span key={t} className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', tc?.bg, tc?.text)}>
                                <ArrowRight size={10} />
                                {tc?.label || t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Note :</strong> La modification du workflow nécessite une intervention technique.
          Veuillez contacter l'équipe de support pour toute modification de la configuration.
        </p>
      </Card>
    </div>
  );
};
