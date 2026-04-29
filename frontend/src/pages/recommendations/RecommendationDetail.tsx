import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Download,
  Plus,
  Upload,
  MessageSquare,
  Clock,
  CheckSquare,
  Paperclip,
  Info,
  Activity,
  AlertTriangle,
  Shield,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { recommendationService } from '../../services/recommendation.service';
import { evidenceService } from '../../services/evidence.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Timeline } from '../../components/ui/Timeline';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CriticalityBadge } from '../../components/recommendations/CriticalityBadge';
import { DeadlineIndicator } from '../../components/recommendations/DeadlineIndicator';
import { WorkflowPanel } from '../../components/recommendations/WorkflowPanel';
import { DeadlineExtensionFormModal } from '../../components/recommendations/DeadlineExtensionForm';
import { ActionPlanList as MiniActionList } from '../actionPlans/ActionPlanList';
import { formatDate, formatDateTime, isOverdue } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

export const RecommendationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canUploadEvidence, canCreateActionPlan, canEditRecommendation, canExportRecommendations } = usePermissions();
  const [activeTab, setActiveTab] = useState('info');
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  const { data: rec, isLoading } = useQuery({
    queryKey: ['recommendation', id],
    queryFn: () => recommendationService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['recommendation-comments', id],
    queryFn: () => recommendationService.getComments(Number(id)),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['recommendation-history', id],
    queryFn: () => recommendationService.getStatusHistory(Number(id)),
    enabled: !!id,
  });

  const { mutate: addComment, isPending: addingComment } = useMutation({
    mutationFn: () =>
      recommendationService.addComment(Number(id), {
        content: newComment,
        is_internal: isInternalComment,
      }),
    onSuccess: () => {
      toast.success('Commentaire ajouté');
      setNewComment('');
      refetchComments();
    },
    onError: () => toast.error("Erreur lors de l'ajout du commentaire"),
  });

  const { mutate: uploadEvidence, isPending: uploadingEvidence } = useMutation({
    mutationFn: () =>
      evidenceService.upload(evidenceFile[0], {
        title: evidenceTitle,
        description: evidenceDesc,
        recommendation_id: Number(id),
      }),
    onSuccess: () => {
      toast.success('Preuve téléchargée');
      setShowEvidenceUpload(false);
      setEvidenceFile([]);
      setEvidenceTitle('');
      setEvidenceDesc('');
      queryClient.invalidateQueries({ queryKey: ['recommendation', id] });
    },
    onError: () => toast.error("Erreur lors du téléchargement"),
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (!rec) return <div>Recommandation non trouvée</div>;

  const overdueAlert = isOverdue(rec.effective_deadline) && rec.status !== 'closed';

  const tabs = [
    { id: 'info', label: 'Informations', icon: <Info size={14} /> },
    {
      id: 'actions',
      label: "Plans d'action",
      icon: <CheckSquare size={14} />,
      badge: rec.action_plans_count,
    },
    {
      id: 'evidences',
      label: 'Preuves',
      icon: <Paperclip size={14} />,
      badge: rec.evidences_count,
    },
    { id: 'comments', label: 'Commentaires', icon: <MessageSquare size={14} />, badge: comments.length },
    { id: 'workflow', label: 'Workflow', icon: <Activity size={14} /> },
    { id: 'history', label: 'Historique', icon: <Clock size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Overdue alert */}
      {overdueAlert && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Recommandation en retard</p>
            <p className="text-xs text-red-600">
              L'échéance du {formatDate(rec.effective_deadline)} est dépassée.
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowExtensionForm(true)}
            className="text-red-600 hover:bg-red-100"
          >
            Demander une prolongation
          </Button>
        </div>
      )}

      {/* Regulatory badge */}
      {rec.is_regulatory && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2">
          <Shield size={16} className="text-orange-500" />
          <p className="text-sm font-medium text-orange-700">
            Recommandation réglementaire — Suivi prioritaire requis
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/recommendations')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded">
                {rec.code}
              </span>
              <StatusBadge status={rec.status} />
              {rec.risk_qualification && (
                <>
                  <CriticalityBadge
                    score={rec.risk_qualification.criticality_score}
                    criticalityClass={rec.risk_qualification.criticality_class}
                  />
                  <PriorityBadge priority={rec.risk_qualification.priority} />
                </>
              )}
            </div>
            <p className="text-xs text-banking-muted">
              Mission: {rec.mission?.title} • {rec.entity?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExtensionForm(true)}
            leftIcon={<Calendar size={14} />}
          >
            Prolonger
          </Button>
          {canExportRecommendations && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={async () => {
                const blob = await recommendationService.exportPdf(rec.id);
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }}
            >
              Export PDF
            </Button>
          )}
          {canEditRecommendation && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil size={14} />}
              onClick={() => navigate(`/recommendations/${id}/edit`)}
            >
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Progress summary */}
      <Card padding="sm">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-banking-muted">Avancement</span>
              <span className="text-xs font-semibold">{rec.progress_rate}%</span>
            </div>
            <ProgressBar value={rec.progress_rate} size="md" />
          </div>
          <div className="flex gap-4 text-center flex-shrink-0">
            <div>
              <p className="text-sm font-bold text-banking-text">{rec.action_plans_count ?? 0}</p>
              <p className="text-xs text-banking-muted">Actions</p>
            </div>
            <div>
              <p className="text-sm font-bold text-banking-text">{rec.evidences_count ?? 0}</p>
              <p className="text-xs text-banking-muted">Preuves</p>
            </div>
            <div>
              <DeadlineIndicator
                deadline={rec.effective_deadline}
                closedAt={rec.closure_date}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Constat</h3>
            <p className="text-sm text-banking-text whitespace-pre-wrap leading-relaxed">{rec.constat}</p>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Recommandation</h3>
            <p className="text-sm text-banking-text whitespace-pre-wrap leading-relaxed">{rec.recommendation_text}</p>
            {rec.recommendation_detail && (
              <div className="mt-3 pt-3 border-t border-banking-border">
                <p className="text-xs font-medium text-banking-muted mb-1">Détail</p>
                <p className="text-sm text-banking-text whitespace-pre-wrap">{rec.recommendation_detail}</p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Qualification du risque</h3>
            {rec.risk_qualification && (
              <div className="space-y-3">
                <InfoRow label="Sévérité" value={`${rec.risk_qualification.severity}/5`} />
                <InfoRow label="Probabilité" value={`${rec.risk_qualification.probability}/5`} />
                <InfoRow label="Score criticité" value={`${rec.risk_qualification.criticality_score}/25`} />
                <InfoRow label="Classe" value={rec.risk_qualification.criticality_class} />
                <div className="pt-2 border-t border-banking-border">
                  <p className="text-xs font-medium text-banking-muted mb-2">Dimensions d'impact</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.risk_qualification.impact_financial && <ImpactTag label="Financier" />}
                    {rec.risk_qualification.impact_regulatory && <ImpactTag label="Réglementaire" />}
                    {rec.risk_qualification.impact_operational && <ImpactTag label="Opérationnel" />}
                    {rec.risk_qualification.impact_reputational && <ImpactTag label="Réputationnel" />}
                    {rec.risk_qualification.impact_strategic && <ImpactTag label="Stratégique" />}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Responsables & Dates</h3>
            <div className="space-y-3">
              <InfoRow label="Responsable" value={rec.responsible_user?.full_name} />
              <InfoRow label="Entité resp." value={rec.responsible_entity?.label} />
              <InfoRow label="Validateur" value={rec.validator_user?.full_name} />
              <InfoRow label="Échéance initiale" value={formatDate(rec.initial_deadline)} />
              {rec.extended_deadline && (
                <InfoRow label="Échéance prolongée" value={formatDate(rec.extended_deadline)} />
              )}
              <InfoRow label="Échéance effective" value={formatDate(rec.effective_deadline)} />
              {rec.closure_date && (
                <InfoRow label="Date de clôture" value={formatDate(rec.closure_date)} />
              )}
              <InfoRow label="Créé le" value={formatDateTime(rec.created_at)} />
              <InfoRow label="Par" value={rec.created_by?.full_name} />
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Action Plans */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-banking-text">Plans d'action associés</h3>
            {canCreateActionPlan && (
              <Button
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => navigate(`/action-plans/new?recommendation_id=${id}`)}
              >
                Ajouter un plan d'action
              </Button>
            )}
          </div>
          {rec.action_plans && rec.action_plans.length > 0 ? (
            <div className="space-y-3">
              {rec.action_plans.map((ap) => (
                <Card
                  key={ap.id}
                  hover
                  onClick={() => navigate(`/action-plans/${ap.id}`)}
                  padding="sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-banking-text">{ap.title}</p>
                      <p className="text-xs text-banking-muted mt-0.5">
                        Échéance: {formatDate(ap.deadline)} • {ap.responsible_user?.full_name || 'Non assigné'}
                      </p>
                      <ProgressBar value={ap.progress_rate} className="mt-2" size="xs" showLabel />
                    </div>
                    <StatusBadge status={ap.status} type="action" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-banking-muted text-center py-4">
                Aucun plan d'action associé
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Evidences */}
      {activeTab === 'evidences' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-banking-text">Preuves</h3>
            {canUploadEvidence && (
              <Button
                size="sm"
                leftIcon={<Upload size={14} />}
                onClick={() => setShowEvidenceUpload(true)}
              >
                Ajouter une preuve
              </Button>
            )}
          </div>

          {rec.evidences && rec.evidences.length > 0 ? (
            <div className="space-y-3">
              {rec.evidences.map((ev) => (
                <Card key={ev.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Paperclip size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-banking-text">{ev.title}</p>
                      <p className="text-xs text-banking-muted">{ev.original_name}</p>
                    </div>
                    <StatusBadge status={ev.status} type="evidence" />
                    <a
                      href={evidenceService.getDownloadUrl(ev.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:text-blue-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-banking-muted text-center py-4">Aucune preuve ajoutée</p>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Comments */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} padding="sm" className={comment.is_internal ? 'border-amber-200 bg-amber-50/50' : ''}>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                  {comment.author?.first_name?.charAt(0)}{comment.author?.last_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-banking-text">{comment.author?.full_name}</span>
                    <span className="text-xs text-banking-muted">{formatDateTime(comment.created_at)}</span>
                    {comment.is_internal && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Interne</span>
                    )}
                  </div>
                  <p className="text-sm text-banking-text whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </Card>
          ))}

          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-3">Ajouter un commentaire</h3>
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Votre commentaire..."
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-banking-text">Commentaire interne</span>
                </label>
                <Button
                  size="sm"
                  isLoading={addingComment}
                  onClick={() => addComment()}
                  disabled={!newComment.trim()}
                >
                  Commenter
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Workflow */}
      {activeTab === 'workflow' && (
        <Card>
          <WorkflowPanel recommendation={rec} />
        </Card>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <Card>
          <h3 className="text-sm font-semibold text-banking-text mb-4">Historique des statuts</h3>
          {history.length > 0 ? (
            <Timeline
              items={history.map((h) => ({
                id: h.id,
                title: `${h.previous_status} → ${h.new_status}`,
                description: h.comment,
                date: formatDateTime(h.created_at),
                color: h.new_status === 'closed' ? 'success' : h.new_status === 'rejected' ? 'danger' : 'primary',
              }))}
            />
          ) : (
            <p className="text-sm text-banking-muted">Aucun historique disponible</p>
          )}

          {rec.deadline_extensions && rec.deadline_extensions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-banking-border">
              <h3 className="text-sm font-semibold text-banking-text mb-4">Prolongations d'échéance</h3>
              <div className="space-y-3">
                {rec.deadline_extensions.map((ext) => (
                  <div key={ext.id} className="flex items-start gap-3 p-3 rounded-lg border border-banking-border">
                    <div className={clsx(
                      'text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                      ext.status === 'approved' ? 'bg-green-100 text-green-700' :
                      ext.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {ext.status === 'approved' ? 'Approuvé' : ext.status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </div>
                    <div>
                      <p className="text-sm text-banking-text">
                        {formatDate(ext.original_deadline)} → {formatDate(ext.new_deadline)}
                      </p>
                      <p className="text-xs text-banking-muted mt-0.5">{ext.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Evidence upload modal */}
      <Modal
        isOpen={showEvidenceUpload}
        onClose={() => setShowEvidenceUpload(false)}
        title="Ajouter une preuve"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Titre" required>
            <Input
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="Titre de la preuve"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              rows={2}
              placeholder="Description optionnelle"
            />
          </FormField>
          <FileUpload
            onFilesSelected={setEvidenceFile}
            label="Sélectionner ou glisser un fichier"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowEvidenceUpload(false)}>
              Annuler
            </Button>
            <Button
              isLoading={uploadingEvidence}
              onClick={() => uploadEvidence()}
              disabled={!evidenceFile.length || !evidenceTitle}
            >
              Télécharger
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extension form */}
      <DeadlineExtensionFormModal
        isOpen={showExtensionForm}
        onClose={() => setShowExtensionForm(false)}
        recommendationId={Number(id)}
        currentDeadline={rec.effective_deadline}
      />
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex items-start gap-3">
    <span className="w-32 flex-shrink-0 text-xs font-medium text-banking-muted">{label}</span>
    <span className="text-sm text-banking-text">{value || '-'}</span>
  </div>
);

const ImpactTag: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
    {label}
  </span>
);
