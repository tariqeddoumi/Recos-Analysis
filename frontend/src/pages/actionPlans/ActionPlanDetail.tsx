import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Upload,
  MessageSquare,
  Paperclip,
  TrendingUp,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { actionPlanService } from '../../services/actionPlan.service';
import { evidenceService } from '../../services/evidence.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { DeadlineIndicator } from '../../components/recommendations/DeadlineIndicator';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';

const ACTION_STATUS_TRANSITIONS: Record<string, { to: string; label: string }[]> = {
  pending: [{ to: 'in_progress', label: 'Démarrer' }],
  in_progress: [
    { to: 'completed', label: 'Marquer complété' },
    { to: 'cancelled', label: 'Annuler' },
  ],
  completed: [],
  cancelled: [{ to: 'pending', label: 'Réactiver' }],
  overdue: [{ to: 'in_progress', label: 'Reprendre' }],
};

export const ActionPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canUploadEvidence, canEditActionPlan, canUpdateProgress } = usePermissions();
  const [activeTab, setActiveTab] = useState('info');
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  const [newComment, setNewComment] = useState('');

  const { data: ap, isLoading } = useQuery({
    queryKey: ['action-plan', id],
    queryFn: () => actionPlanService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['action-plan-comments', id],
    queryFn: () => actionPlanService.getComments(Number(id)),
    enabled: !!id,
  });

  const { mutate: changeStatus, isPending: changingStatus } = useMutation({
    mutationFn: (status: string) => actionPlanService.changeStatus(Number(id), status),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['action-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  const { mutate: updateProgress, isPending: updatingProgress } = useMutation({
    mutationFn: (progress: number) => actionPlanService.updateProgress(Number(id), progress),
    onSuccess: () => {
      toast.success('Avancement mis à jour');
      setShowProgressModal(false);
      queryClient.invalidateQueries({ queryKey: ['action-plan', id] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const { mutate: addComment, isPending: addingComment } = useMutation({
    mutationFn: () =>
      actionPlanService.addComment(Number(id), { content: newComment, is_internal: false }),
    onSuccess: () => {
      toast.success('Commentaire ajouté');
      setNewComment('');
      refetchComments();
    },
    onError: () => toast.error("Erreur"),
  });

  const { mutate: uploadEvidence, isPending: uploadingEvidence } = useMutation({
    mutationFn: () =>
      evidenceService.upload(evidenceFile[0], {
        title: evidenceTitle,
        action_plan_id: Number(id),
      }),
    onSuccess: () => {
      toast.success('Preuve téléchargée');
      setShowEvidenceUpload(false);
      queryClient.invalidateQueries({ queryKey: ['action-plan', id] });
    },
    onError: () => toast.error("Erreur lors du téléchargement"),
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (!ap) return <div>Plan d'action non trouvé</div>;

  const transitions = ACTION_STATUS_TRANSITIONS[ap.status] || [];

  const tabs = [
    { id: 'info', label: 'Informations' },
    { id: 'evidences', label: 'Preuves', badge: ap.evidences_count },
    { id: 'comments', label: 'Commentaires', badge: comments.length },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/action-plans')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={ap.status} type="action" />
            </div>
            <h1 className="text-xl font-bold text-banking-text">{ap.title}</h1>
            <p className="text-xs text-banking-muted mt-0.5">
              Recommandation: {ap.recommendation?.code || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {transitions.map((t) => (
            <Button
              key={t.to}
              variant={t.to === 'cancelled' ? 'danger' : t.to === 'completed' ? 'success' : 'secondary'}
              size="sm"
              isLoading={changingStatus}
              onClick={() => changeStatus(t.to)}
            >
              {t.label}
            </Button>
          ))}
          {canUpdateProgress && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<TrendingUp size={14} />}
              onClick={() => {
                setNewProgress(ap.progress_rate);
                setShowProgressModal(true);
              }}
            >
              Mettre à jour
            </Button>
          )}
          {canEditActionPlan && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil size={14} />}
              onClick={() => navigate(`/action-plans/${id}/edit`)}
            >
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card padding="sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-banking-muted">Avancement</span>
              <span className="text-xs font-semibold">{ap.progress_rate}%</span>
            </div>
            <ProgressBar value={ap.progress_rate} size="md" />
          </div>
          <DeadlineIndicator deadline={ap.deadline} closedAt={ap.completion_date} />
        </div>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold text-banking-text mb-4">Détails</h3>
            <div className="space-y-3">
              <InfoRow label="Description" value={ap.description} />
              <InfoRow label="Responsable" value={ap.responsible_user?.full_name} />
              <InfoRow label="Entité resp." value={ap.responsible_entity?.label} />
              <InfoRow label="Date début" value={formatDate(ap.start_date)} />
              <InfoRow label="Échéance" value={formatDate(ap.deadline)} />
              {ap.completion_date && <InfoRow label="Complété le" value={formatDate(ap.completion_date)} />}
              <InfoRow label="Créé le" value={formatDateTime(ap.created_at)} />
            </div>
          </Card>

          {(ap.budget_allocated !== undefined || ap.budget_consumed !== undefined) && (
            <Card>
              <h3 className="text-sm font-semibold text-banking-text mb-4">Budget</h3>
              <div className="space-y-3">
                <InfoRow label="Budget alloué" value={formatCurrency(ap.budget_allocated)} />
                <InfoRow label="Budget consommé" value={formatCurrency(ap.budget_consumed)} />
                {ap.budget_allocated && ap.budget_consumed !== undefined && (
                  <div>
                    <p className="text-xs text-banking-muted mb-1">Utilisation</p>
                    <ProgressBar
                      value={ap.budget_consumed}
                      max={ap.budget_allocated}
                      showLabel
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'evidences' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-banking-text">Preuves</h3>
            {canUploadEvidence && (
              <Button size="sm" leftIcon={<Upload size={14} />} onClick={() => setShowEvidenceUpload(true)}>
                Ajouter une preuve
              </Button>
            )}
          </div>
          {ap.evidences && ap.evidences.length > 0 ? (
            <div className="space-y-2">
              {ap.evidences.map((ev) => (
                <Card key={ev.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Paperclip size={14} className="text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-banking-muted">{ev.original_name}</p>
                    </div>
                    <StatusBadge status={ev.status} type="evidence" />
                    <a href={evidenceService.getDownloadUrl(ev.id)} target="_blank" rel="noopener noreferrer">
                      <Download size={14} className="text-secondary" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card><p className="text-sm text-banking-muted text-center py-4">Aucune preuve</p></Card>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.map((c) => (
            <Card key={c.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                  {c.author?.first_name?.charAt(0)}{c.author?.last_name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{c.author?.full_name}</span>
                    <span className="text-xs text-banking-muted">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-banking-text">{c.content}</p>
                </div>
              </div>
            </Card>
          ))}
          <Card>
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Ajouter un commentaire..."
              />
              <div className="flex justify-end">
                <Button size="sm" isLoading={addingComment} onClick={() => addComment()} disabled={!newComment.trim()}>
                  Commenter
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Progress update modal */}
      <Modal isOpen={showProgressModal} onClose={() => setShowProgressModal(false)} title="Mettre à jour l'avancement" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-banking-text block mb-2">
              Avancement: {newProgress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              className="w-full"
            />
            <ProgressBar value={newProgress} className="mt-2" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowProgressModal(false)}>Annuler</Button>
            <Button isLoading={updatingProgress} onClick={() => updateProgress(newProgress)}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Evidence upload modal */}
      <Modal isOpen={showEvidenceUpload} onClose={() => setShowEvidenceUpload(false)} title="Ajouter une preuve">
        <div className="space-y-4">
          <FormField label="Titre" required>
            <Input value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Titre" />
          </FormField>
          <FileUpload onFilesSelected={setEvidenceFile} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowEvidenceUpload(false)}>Annuler</Button>
            <Button isLoading={uploadingEvidence} onClick={() => uploadEvidence()} disabled={!evidenceFile.length || !evidenceTitle}>
              Télécharger
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex items-start gap-3">
    <span className="w-32 flex-shrink-0 text-xs font-medium text-banking-muted">{label}</span>
    <span className="text-sm text-banking-text">{value || '-'}</span>
  </div>
);
