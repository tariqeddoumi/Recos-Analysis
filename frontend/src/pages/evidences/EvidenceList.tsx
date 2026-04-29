import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, CheckCircle2, XCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { evidenceService } from '../../services/evidence.service';
import { Evidence, EvidenceStatus } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { formatDate, formatDateTime, formatFileSize } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    type: 'select',
    options: [
      { value: 'pending', label: 'En attente' },
      { value: 'submitted', label: 'Soumis' },
      { value: 'approved', label: 'Approuvé' },
      { value: 'rejected', label: 'Rejeté' },
    ],
  },
];

export const EvidenceList: React.FC = () => {
  const queryClient = useQueryClient();
  const { canUploadEvidence, canReviewEvidence, canDeleteEvidence } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [showUpload, setShowUpload] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['evidences', page, limit, search, filters],
    queryFn: () =>
      evidenceService.getAll({
        page,
        limit,
        search: search || undefined,
        status: (filters.status as EvidenceStatus) || undefined,
      }),
  });

  const { mutate: reviewEvidence, isPending: reviewing } = useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: 'approved' | 'rejected'; comment?: string }) =>
      evidenceService.review(id, status, comment),
    onSuccess: () => {
      toast.success('Preuve examinée');
      setShowReviewModal(false);
      setSelectedEvidence(null);
      queryClient.invalidateQueries({ queryKey: ['evidences'] });
    },
    onError: () => toast.error('Erreur lors de la révision'),
  });

  const { mutate: uploadEvidence, isPending: uploading } = useMutation({
    mutationFn: () =>
      evidenceService.upload(evidenceFiles[0], {
        title: evidenceTitle,
        description: evidenceDesc,
      }),
    onSuccess: () => {
      toast.success('Preuve téléchargée');
      setShowUpload(false);
      setEvidenceFiles([]);
      setEvidenceTitle('');
      queryClient.invalidateQueries({ queryKey: ['evidences'] });
    },
    onError: () => toast.error('Erreur lors du téléchargement'),
  });

  const columns: Column<Evidence>[] = [
    {
      key: 'title',
      label: 'Titre',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-banking-text">{row.title}</p>
          <p className="text-xs text-banking-muted">{row.original_name} ({formatFileSize(row.size)})</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row) => <StatusBadge status={row.status} type="evidence" />,
    },
    {
      key: 'uploaded_by',
      label: 'Téléversé par',
      render: (row) => <span className="text-sm">{row.uploaded_by?.full_name || '-'}</span>,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'reviewer',
      label: 'Révisé par',
      render: (row) => <span className="text-sm">{row.reviewer?.full_name || '-'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <a
            href={evidenceService.getDownloadUrl(row.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-blue-50 transition-colors"
            title="Télécharger"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
          {canReviewEvidence && row.status === 'submitted' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvidence(row);
                  setShowReviewModal(true);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-green-50 transition-colors"
                title="Examiner"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reviewEvidence({ id: row.id, status: 'approved' });
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                title="Approuver"
              >
                <CheckCircle2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reviewEvidence({ id: row.id, status: 'rejected' });
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Rejeter"
              >
                <XCircle size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Preuves</h1>
          <p className="text-sm text-banking-muted">{data?.total ?? 0} preuve{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        {canUploadEvidence && (
          <Button size="sm" leftIcon={<Upload size={14} />} onClick={() => setShowUpload(true)}>
            Téléverser
          </Button>
        )}
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); }}
        onReset={() => { setFilters({}); setSearch(''); setPage(1); }}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher une preuve..."
      />

      <DataTable<Evidence>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        emptyMessage="Aucune preuve trouvée"
      />

      {/* Upload modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Téléverser une preuve">
        <div className="space-y-4">
          <FormField label="Titre" required>
            <Input value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Titre de la preuve" />
          </FormField>
          <FormField label="Description">
            <Textarea value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} rows={2} />
          </FormField>
          <FileUpload onFilesSelected={setEvidenceFiles} label="Sélectionner un fichier" />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Annuler</Button>
            <Button isLoading={uploading} onClick={() => uploadEvidence()} disabled={!evidenceFiles.length || !evidenceTitle}>
              Téléverser
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Examiner la preuve">
        {selectedEvidence && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium">{selectedEvidence.title}</p>
              <p className="text-xs text-banking-muted">{selectedEvidence.original_name}</p>
            </div>
            <FormField label="Commentaire (optionnel)">
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Votre commentaire..."
              />
            </FormField>
            <div className="flex justify-end gap-3">
              <Button
                variant="danger"
                isLoading={reviewing}
                onClick={() => reviewEvidence({ id: selectedEvidence.id, status: 'rejected', comment: reviewComment })}
              >
                Rejeter
              </Button>
              <Button
                variant="success"
                isLoading={reviewing}
                onClick={() => reviewEvidence({ id: selectedEvidence.id, status: 'approved', comment: reviewComment })}
              >
                Approuver
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
