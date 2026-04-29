import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { Recommendation, RecommendationStatus, PriorityLevel } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { DeadlineIndicator } from '../../components/recommendations/DeadlineIndicator';
import { CriticalityBadge } from '../../components/recommendations/CriticalityBadge';
import { truncateText, formatDate } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { exportRecommendationsToExcel } from '../../utils/exportUtils';
import { isOverdue } from '../../utils/formatters';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: RecommendationStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'open', label: 'Ouverte' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'pending_validation', label: 'En validation' },
  { value: 'validated', label: 'Validée' },
  { value: 'closed', label: 'Clôturée' },
  { value: 'rejected', label: 'Rejetée' },
  { value: 'overdue', label: 'En retard' },
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'very_high', label: 'Très élevé' },
  { value: 'critical', label: 'Critique' },
];

const filterConfigs: FilterConfig[] = [
  { key: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS },
  { key: 'priority', label: 'Priorité', type: 'select', options: PRIORITY_OPTIONS },
  { key: 'is_regulatory', label: 'Réglementaire uniquement', type: 'checkbox' },
  { key: 'is_overdue', label: 'En retard uniquement', type: 'checkbox' },
  { key: 'deadline_from', label: 'Échéance du', type: 'date' },
  { key: 'deadline_to', label: 'Échéance au', type: 'date' },
];

export const RecommendationList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canCreateRecommendation, canExportRecommendations } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState<Record<string, unknown>>({
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
    is_overdue: searchParams.get('is_overdue') === 'true' ? true : undefined,
    mission_id: searchParams.get('mission_id') ? Number(searchParams.get('mission_id')) : undefined,
  });
  const [sortKey, setSortKey] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', page, limit, search, filters, sortKey, sortOrder],
    queryFn: () =>
      recommendationService.getAll({
        page,
        limit,
        search: search || undefined,
        sort_by: sortKey,
        sort_order: sortOrder,
        ...filters,
      }),
  });

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const all = await recommendationService.getAll({ limit: 10000, search, ...filters });
      exportRecommendationsToExcel(all.data, 'recommandations.xlsx');
      toast.success('Export réussi');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const getRowClass = (row: Recommendation): string => {
    if (row.risk_qualification?.criticality_class === 'critical') return 'bg-red-50/50';
    if (isOverdue(row.effective_deadline) && row.status !== 'closed') return 'bg-orange-50/30';
    return '';
  };

  const columns: Column<Recommendation>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-semibold text-primary">{row.code}</span>
          {row.is_regulatory && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600">
              <ShieldAlert size={10} />
              Réglementaire
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'mission',
      label: 'Mission',
      render: (row) => (
        <span className="text-xs text-banking-muted">{row.mission?.title ? truncateText(row.mission.title, 30) : '-'}</span>
      ),
    },
    {
      key: 'constat',
      label: 'Constat',
      render: (row) => (
        <div>
          <p className="text-sm text-banking-text">{truncateText(row.constat, 70)}</p>
          <p className="text-xs text-banking-muted mt-0.5">{row.entity?.label}</p>
        </div>
      ),
    },
    {
      key: 'risk_qualification',
      label: 'Criticité',
      render: (row) => (
        row.risk_qualification ? (
          <CriticalityBadge
            score={row.risk_qualification.criticality_score}
            criticalityClass={row.risk_qualification.criticality_class}
          />
        ) : <span className="text-banking-muted">-</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priorité',
      render: (row) => (
        row.risk_qualification?.priority ? (
          <PriorityBadge priority={row.risk_qualification.priority} />
        ) : <span className="text-banking-muted">-</span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'progress_rate',
      label: 'Avancement',
      render: (row) => (
        <div className="w-24">
          <ProgressBar value={row.progress_rate} showLabel size="xs" />
        </div>
      ),
    },
    {
      key: 'effective_deadline',
      label: 'Échéance',
      sortable: true,
      render: (row) => (
        <DeadlineIndicator
          deadline={row.effective_deadline}
          closedAt={row.closure_date}
        />
      ),
    },
    {
      key: 'responsible_user',
      label: 'Responsable',
      render: (row) => (
        <span className="text-sm">{row.responsible_user?.full_name || '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/recommendations/${row.id}`);
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Recommandations</h1>
          <p className="text-sm text-banking-muted">
            {data?.total ?? 0} recommandation{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportRecommendations && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download size={14} />}
            >
              Exporter
            </Button>
          )}
          {canCreateRecommendation && (
            <Button
              size="sm"
              onClick={() => navigate('/recommendations/new')}
              leftIcon={<Plus size={14} />}
            >
              Nouvelle recommandation
            </Button>
          )}
        </div>
      </div>

      {/* Alert for overdue */}
      {data?.data?.some((r) => isOverdue(r.effective_deadline) && r.status !== 'closed') && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Certaines recommandations sont en retard. Veuillez prendre les mesures nécessaires.
          </p>
          <button
            onClick={() => handleFilterChange('is_overdue', true)}
            className="ml-auto text-xs font-semibold text-red-600 hover:underline flex-shrink-0"
          >
            Voir les retards
          </button>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher une recommandation..."
      />

      {/* Table */}
      <DataTable<Recommendation>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
        }}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onRowClick={(row) => navigate(`/recommendations/${row.id}`)}
        rowClassName={(row) => getRowClass(row)}
        emptyMessage="Aucune recommandation trouvée"
      />
    </div>
  );
};
