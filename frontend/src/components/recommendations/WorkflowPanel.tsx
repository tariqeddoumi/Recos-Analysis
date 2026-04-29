import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { Recommendation, RecommendationStatus } from '../../types';
import { recommendationService } from '../../services/recommendation.service';
import { statusColors } from '../../utils/colors';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { FormField } from '../ui/FormField';

const TRANSITIONS: Record<RecommendationStatus, { to: RecommendationStatus; label: string; variant: 'primary' | 'success' | 'danger' | 'secondary' }[]> = {
  draft: [{ to: 'open', label: 'Ouvrir', variant: 'primary' }],
  open: [{ to: 'in_progress', label: 'Démarrer', variant: 'primary' }],
  in_progress: [{ to: 'pending_validation', label: 'Soumettre pour validation', variant: 'secondary' }],
  pending_validation: [
    { to: 'validated', label: 'Valider', variant: 'success' },
    { to: 'rejected', label: 'Rejeter', variant: 'danger' },
  ],
  validated: [{ to: 'closed', label: 'Clôturer', variant: 'success' }],
  closed: [],
  rejected: [{ to: 'in_progress', label: 'Reprendre', variant: 'primary' }],
  overdue: [{ to: 'in_progress', label: 'Reprendre', variant: 'primary' }],
};

const WORKFLOW_STEPS: RecommendationStatus[] = [
  'draft',
  'open',
  'in_progress',
  'pending_validation',
  'validated',
  'closed',
];

interface WorkflowPanelProps {
  recommendation: Recommendation;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ recommendation }) => {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<{
    to: RecommendationStatus;
    label: string;
  } | null>(null);
  const [comment, setComment] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: ({ status, comment }: { status: string; comment?: string }) =>
      recommendationService.changeStatus(recommendation.id, status, comment),
    onSuccess: () => {
      toast.success('Statut mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['recommendation', recommendation.id] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setSelectedTransition(null);
      setComment('');
    },
    onError: () => {
      toast.error('Erreur lors du changement de statut');
    },
  });

  const transitions = TRANSITIONS[recommendation.status] || [];
  const currentStepIndex = WORKFLOW_STEPS.indexOf(
    recommendation.status === 'overdue' ? 'in_progress' : recommendation.status
  );

  return (
    <div className="space-y-6">
      {/* Visual workflow */}
      <div>
        <h3 className="text-sm font-semibold text-banking-text mb-4">Progression du workflow</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const config = statusColors[step];
            const isActive = step === recommendation.status ||
              (recommendation.status === 'overdue' && step === 'in_progress');
            const isDone = index < currentStepIndex;

            return (
              <React.Fragment key={step}>
                <div
                  className={clsx(
                    'flex flex-col items-center gap-1.5 flex-shrink-0',
                  )}
                >
                  <div
                    className={clsx(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                      isActive
                        ? `${config.bg} ${config.text} border-current`
                        : isDone
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    )}
                  >
                    {isDone ? '✓' : index + 1}
                  </div>
                  <span
                    className={clsx(
                      'text-xs whitespace-nowrap font-medium',
                      isActive ? config.text : isDone ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {config?.label || step}
                  </span>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'flex-1 h-0.5 min-w-4',
                      isDone ? 'bg-green-400' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {transitions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-banking-text mb-3">Actions disponibles</h3>
          <div className="flex flex-wrap gap-3">
            {transitions.map((t) => (
              <Button
                key={t.to}
                variant={t.variant}
                onClick={() => setSelectedTransition(t)}
                rightIcon={<ArrowRight size={14} />}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Modal
        isOpen={!!selectedTransition}
        onClose={() => setSelectedTransition(null)}
        title={`Confirmation: ${selectedTransition?.label}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir changer le statut vers{' '}
            <strong>{statusColors[selectedTransition?.to || 'draft']?.label}</strong> ?
          </p>

          <FormField label="Commentaire (optionnel)">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Ajoutez un commentaire..."
            />
          </FormField>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setSelectedTransition(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant={selectedTransition?.to === 'rejected' ? 'danger' : 'primary'}
              isLoading={isPending}
              onClick={() =>
                selectedTransition &&
                mutate({ status: selectedTransition.to, comment: comment || undefined })
              }
            >
              {selectedTransition?.label}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
