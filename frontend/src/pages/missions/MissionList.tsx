import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download, Eye, Pencil } from 'lucide-react';
import { missionService } from '../../services/mission.service';
import { Mission, RecommendationStatus } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDate } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { exportMissionsToExcel } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const MISSION_TYPE_LABELS: Record<string, string> = {
  internal_audit: 'Audit interne',
  external_audit: 'Audit externe',
  regulatory: 'Réglementaire',
  inspection: 'Inspection',
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Clôturée' },
  { value: 'archived', label: 'Archivée' },
];

const TYPE_OPTIONS = [
  { value: 'internal_audit', label: 'Audit interne' },
  { value: 'external_audit', label: 'Audit externe' },
  { value: 'regulatory', label: 'Réglementaire' },
  { value: 'inspection', label: 'Inspection' },
];

const filterConfigs: FilterConfig[] = [
  { key: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS },
  { key: 'type', label: 'Type', type: 'select', options: TYPE_OPTIONS },
  { key: 'date_from', label: 'Du', type: 'date' },
  { key: 'date_to', label: 'Au', type: 'date' },
];

export const MissionList: React.FC = () => {
  const navigate = useNavigate();
  const { canCreateMission } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [sortKey, setSortKey] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['missions', page, limit, search, filters, sortKey, sortOrder],
    queryFn: () =>
      missionService.getAll({
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
      const all = await missionService.getAll({ limit: 10000, search, ...filters });
      exportMissionsToExcel(all.data, 'missions.xlsx');
      toast.success('Export réussi');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const columns: Column<Mission>[] = [
    {
      key: 'reference',
      label: 'Référence',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">{row.reference}</span>
      ),
    },
    {
      key: 'title',
      label: 'Titre',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-banking-text">{row.title}</p>
          <p className="text-xs text-banking-muted">{MISSION_TYPE_LABELS[row.type]}</p>
        </div>
      ),
    },
    {
      key: 'source_type',
      label: 'Source',
      render: (row) => (
        <span className="text-sm">{row.source_type?.label || '-'}</span>
      ),
    },
    {
      key: 'entity',
      label: 'Entité',
      render: (row) => (
        <span className="text-sm">{row.entity?.label || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (row) => (
        <StatusBadge status={row.status as unknown as RecommendationStatus} />
      ),
    },
    {
      key: 'recommendations_count',
      label: 'Recs.',
      align: 'center',
      render: (row) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary">
          {row.recommendations_count ?? 0}
        </span>
      ),
    },
    {
      key: 'progress_rate',
      label: 'Avancement',
      render: (row) => (
        <div className="w-24">
          <ProgressBar value={row.progress_rate ?? 0} showLabel size="xs" />
        </div>
      ),
    },
    {
      key: 'start_date',
      label: 'Début',
      sortable: true,
      render: (row) => formatDate(row.start_date),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/missions/${row.id}`);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            title="Voir"
          >
            <Eye size={14} />
          </button>
          {canCreateMission && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/missions/${row.id}/edit`);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-secondary hover:bg-blue-50 transition-colors"
              title="Modifier"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Missions</h1>
          <p className="text-sm text-banking-muted">
            {data?.total ?? 0} mission{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            leftIcon={<Download size={14} />}
          >
            Exporter
          </Button>
          {canCreateMission && (
            <Button
              size="sm"
              onClick={() => navigate('/missions/new')}
              leftIcon={<Plus size={14} />}
            >
              Nouvelle mission
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher une mission..."
      />

      {/* Table */}
      <DataTable<Mission>
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
        onRowClick={(row) => navigate(`/missions/${row.id}`)}
        emptyMessage="Aucune mission trouvée pour les filtres sélectionnés"
      />
    </div>
  );
};
