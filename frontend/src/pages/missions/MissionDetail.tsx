import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Building2,
  Calendar,
  User,
  FileText,
  Paperclip,
  Clock,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { missionService } from '../../services/mission.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { Mission, MissionStatus } from '../../types';

const MISSION_TYPE_LABELS: Record<string, string> = {
  internal_audit: 'Audit interne',
  external_audit: 'Audit externe',
  regulatory: 'Réglementaire',
  inspection: 'Inspection',
};

const STATUS_TRANSITIONS: Record<MissionStatus, { to: MissionStatus; label: string }[]> = {
  draft: [{ to: 'active', label: 'Activer' }],
  active: [{ to: 'closed', label: 'Clôturer' }],
  closed: [{ to: 'archived', label: 'Archiver' }],
  archived: [],
};

export const MissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEditMission } = usePermissions();
  const [activeTab, setActiveTab] = useState('info');

  const { data: mission, isLoading } = useQuery({
    queryKey: ['mission', id],
    queryFn: () => missionService.getById(Number(id)),
    enabled: !!id,
  });

  const { mutate: changeStatus, isPending } = useMutation({
    mutationFn: (status: string) => missionService.changeStatus(Number(id), status),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['mission', id] });
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (!mission) return <div>Mission non trouvée</div>;

  const transitions = STATUS_TRANSITIONS[mission.status] || [];

  const tabs = [
    { id: 'info', label: 'Informations', icon: <FileText size={14} /> },
    {
      id: 'recommendations',
      label: 'Recommandations',
      icon: <CheckSquare size={14} />,
      badge: mission.recommendations_count,
    },
    { id: 'attachments', label: 'Pièces jointes', icon: <Paperclip size={14} /> },
    { id: 'history', label: 'Historique', icon: <Clock size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/missions')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded">
                {mission.reference}
              </span>
              <StatusBadge status={mission.status} />
            </div>
            <h1 className="text-xl font-bold text-banking-text">{mission.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {transitions.map((t) => (
            <Button
              key={t.to}
              variant="secondary"
              size="sm"
              isLoading={isPending}
              onClick={() => changeStatus(t.to)}
            >
              {t.label}
            </Button>
          ))}
          {canEditMission && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil size={14} />}
              onClick={() => navigate(`/missions/${id}/edit`)}
            >
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Card padding="sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-banking-muted">Avancement global</span>
              <span className="text-xs font-semibold text-banking-text">
                {mission.progress_rate ?? 0}%
              </span>
            </div>
            <ProgressBar value={mission.progress_rate ?? 0} size="md" />
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-banking-text">{mission.recommendations_count ?? 0}</p>
              <p className="text-xs text-banking-muted">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-secondary">{mission.open_recommendations_count ?? 0}</p>
              <p className="text-xs text-banking-muted">Ouvertes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-accent">{mission.closed_recommendations_count ?? 0}</p>
              <p className="text-xs text-banking-muted">Clôturées</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Informations générales</h3>
            <dl className="space-y-3">
              <InfoRow label="Type" value={MISSION_TYPE_LABELS[mission.type]} />
              <InfoRow label="Source" value={mission.source_type?.label} />
              <InfoRow
                label="Entité concernée"
                value={mission.entity?.label}
                icon={<Building2 size={14} />}
              />
              <InfoRow
                label="Responsable"
                value={mission.manager?.full_name}
                icon={<User size={14} />}
              />
              <InfoRow
                label="Date de début"
                value={formatDate(mission.start_date)}
                icon={<Calendar size={14} />}
              />
              <InfoRow
                label="Date de fin"
                value={formatDate(mission.end_date)}
                icon={<Calendar size={14} />}
              />
              <InfoRow
                label="Date du rapport"
                value={formatDate(mission.report_date)}
                icon={<Calendar size={14} />}
              />
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Description & Périmètre</h3>
            {mission.description ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-banking-muted mb-1">Description</p>
                  <p className="text-sm text-banking-text whitespace-pre-wrap">{mission.description}</p>
                </div>
                {mission.scope && (
                  <div>
                    <p className="text-xs font-medium text-banking-muted mb-1">Périmètre</p>
                    <p className="text-sm text-banking-text whitespace-pre-wrap">{mission.scope}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-banking-muted">Aucune description renseignée</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-banking-text">
              Recommandations de cette mission
            </h3>
            <Button
              size="sm"
              onClick={() => navigate(`/recommendations?mission_id=${id}`)}
            >
              Voir toutes
            </Button>
          </div>
          <p className="text-sm text-banking-muted">
            Cette mission comporte {mission.recommendations_count ?? 0} recommandation(s).
            Cliquez sur "Voir toutes" pour les consulter.
          </p>
        </Card>
      )}

      {activeTab === 'attachments' && (
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-4">Pièces jointes</h3>
          {mission.attachments?.length === 0 || !mission.attachments ? (
            <p className="text-sm text-banking-muted">Aucune pièce jointe</p>
          ) : (
            <ul className="space-y-2">
              {mission.attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-banking-border"
                >
                  <Paperclip size={14} className="text-gray-400" />
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-secondary hover:underline"
                  >
                    {att.original_name}
                  </a>
                  <span className="text-xs text-banking-muted ml-auto">
                    {formatDate(att.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-4">Historique</h3>
          <div className="text-sm text-banking-muted">
            <p>Créé le {formatDate(mission.created_at)} par {mission.created_by?.full_name}</p>
            <p className="mt-1">Dernière modification le {formatDate(mission.updated_at)}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

const InfoRow: React.FC<{
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-start gap-2">
    <dt className="w-36 flex-shrink-0 text-xs font-medium text-banking-muted">{label}</dt>
    <dd className="flex items-center gap-1.5 text-sm text-banking-text">
      {icon && <span className="text-gray-400">{icon}</span>}
      {value || '-'}
    </dd>
  </div>
);
