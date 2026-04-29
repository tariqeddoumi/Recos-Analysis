import React from 'react';
import clsx from 'clsx';
import { Card } from '../../components/ui/Card';
import { getCriticalityClass } from '../../utils/colors';
import { criticalityColors, priorityColors } from '../../utils/colors';

interface RiskQualificationProps {
  severity: number;
  probability: number;
  onSeverityChange: (value: number) => void;
  onProbabilityChange: (value: number) => void;
  impacts?: {
    financial: boolean;
    regulatory: boolean;
    operational: boolean;
    reputational: boolean;
    strategic: boolean;
  };
  onImpactChange?: (key: string, value: boolean) => void;
}

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Négligeable',
  2: 'Mineure',
  3: 'Modérée',
  4: 'Majeure',
  5: 'Critique',
};

const PROBABILITY_LABELS: Record<number, string> = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Modérée',
  4: 'Élevée',
  5: 'Très élevée',
};

const getPriorityFromScore = (score: number): string => {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
};

export const RiskQualification: React.FC<RiskQualificationProps> = ({
  severity,
  probability,
  onSeverityChange,
  onProbabilityChange,
  impacts,
  onImpactChange,
}) => {
  const score = severity * probability;
  const critClass = getCriticalityClass(score);
  const critConfig = criticalityColors[critClass];
  const priorityKey = getPriorityFromScore(score) as keyof typeof priorityColors;
  const priorityConfig = priorityColors[priorityKey];

  const IMPACT_LABELS = [
    { key: 'financial', label: 'Impact financier' },
    { key: 'regulatory', label: 'Impact réglementaire' },
    { key: 'operational', label: 'Impact opérationnel' },
    { key: 'reputational', label: 'Impact réputationnel' },
    { key: 'strategic', label: 'Impact stratégique' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Severity */}
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-3">Sévérité</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onSeverityChange(val)}
                className={clsx(
                  'flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-all',
                  severity === val
                    ? 'border-primary bg-primary text-white'
                    : 'border-banking-border text-banking-muted hover:border-primary hover:text-primary'
                )}
              >
                {val}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-center text-banking-muted">
            {severity > 0 ? SEVERITY_LABELS[severity] : 'Sélectionner'}
          </p>
        </Card>

        {/* Probability */}
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-3">Probabilité</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onProbabilityChange(val)}
                className={clsx(
                  'flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-all',
                  probability === val
                    ? 'border-primary bg-primary text-white'
                    : 'border-banking-border text-banking-muted hover:border-primary hover:text-primary'
                )}
              >
                {val}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-center text-banking-muted">
            {probability > 0 ? PROBABILITY_LABELS[probability] : 'Sélectionner'}
          </p>
        </Card>
      </div>

      {/* Criticality score display */}
      {severity > 0 && probability > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-banking-muted mb-1">Score de criticité</p>
              <p className="text-sm text-banking-muted">
                Sévérité ({severity}) × Probabilité ({probability})
              </p>
            </div>
            <div className="text-center">
              <div
                className={clsx(
                  'h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-black text-white',
                  critConfig.score
                )}
              >
                {score}
              </div>
              <p className={clsx('mt-1 text-xs font-semibold', critConfig.text)}>
                {critConfig.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-banking-muted mb-1">Priorité calculée</p>
              <span
                className={clsx(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                  priorityConfig.bg,
                  priorityConfig.text
                )}
              >
                {priorityConfig.label}
              </span>
            </div>
          </div>

          {/* Matrix visualization */}
          <div className="mt-4 pt-4 border-t border-banking-border">
            <p className="text-xs font-medium text-banking-muted mb-3">Matrice de risque</p>
            <div className="grid grid-cols-6 gap-0.5 text-xs text-center">
              <div className="text-banking-muted text-right pr-1 flex items-end justify-end pb-1">P\S</div>
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="font-bold text-banking-muted">{s}</div>
              ))}
              {[5, 4, 3, 2, 1].map((p) => (
                <React.Fragment key={p}>
                  <div className="font-bold text-banking-muted text-right pr-1">{p}</div>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const cellScore = s * p;
                    const cellClass = getCriticalityClass(cellScore);
                    const cellConfig = criticalityColors[cellClass];
                    const isActive = s === severity && p === probability;
                    return (
                      <div
                        key={s}
                        className={clsx(
                          'aspect-square flex items-center justify-center rounded text-xs font-bold',
                          cellConfig.bg,
                          cellConfig.text,
                          isActive && 'ring-2 ring-offset-1 ring-banking-text'
                        )}
                      >
                        {cellScore}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Impacts */}
      {impacts && onImpactChange && (
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-3">Dimensions d'impact</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {IMPACT_LABELS.map(({ key, label }) => (
              <label
                key={key}
                className={clsx(
                  'flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  (impacts as Record<string, boolean>)[key]
                    ? 'border-primary bg-primary-50'
                    : 'border-banking-border hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={(impacts as Record<string, boolean>)[key] || false}
                  onChange={(e) => onImpactChange(key, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span
                  className={clsx(
                    'text-sm font-medium',
                    (impacts as Record<string, boolean>)[key] ? 'text-primary' : 'text-banking-text'
                  )}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
