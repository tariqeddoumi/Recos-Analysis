import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Download } from 'lucide-react';
import { actionPlanService } from '../../services/actionPlan.service';
import { ActionPlan } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { DeadlineIndicator } from '../../components/recommendations/DeadlineIndicator';
import { truncateText, formatDate, formatCurrency } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { exportActionPlansToExcel } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const filterConfigs: FilterConfig[] = [
  {
    key: 'action_status',
    label: 'Statut',
    type: 'select',
    options: [
      { value: 'pending', label: 'En attente' },
      { value: 'in_progress', label: 'En cours' },
      { value: 'completed', label: 'Complété' },
      { value: 'cancelled', label: 'Annulé' },
      { value: 'overdue', label: 'En retard' },
    ],
  },
  { key: 'deadline_from', label: 'Échéance du', type: 'date' },
  { key: 'deadline_to', label: 'Échéance au', type: 'date' },
];

interface ActionPlanListProps {
  recommendationId?: number;
  embedded?: boolean;
}

export const ActionPlanList: React.FC<ActionPlanListProps> = ({
  recommendationId,
  embedded = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canCreateActionPlan } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(embedded ? 10 : 25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({
    recommendation_id: recommendationId || (searchParams.get('recommendation_id') ? Number(searchParams.get('recommendation_id')) : undefined),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['action-plans', page, limit, search, filters],
    queryFn: () =>
      actionPlanService.getAll({
        page,
        limit,
        search: search || undefined,
        ...filters,
      }),
  });

  const handleExport = async () => {
    try {
      const all = await actionPlanService.getAll({ limit: 10000, search, ...filters });
      exportActionPlansToExcel(all.data, 'plans-action.xlsx');
      toast.success('Export réussi');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const columns: Column<ActionPlan>[] = [
    {
      key: 'title',
      label: 'Titre',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-banking-text">{row.title}</p>
          {!recommendationId && (
            <p className="text-xs text-banking-muted mt-0.5">
              {row.recommendation?.code || '-'}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row) => <StatusBadge status={row.status} type="action" />,
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
      key: 'deadline',
      label: 'Échéance',
      render: (row) => (
        <DeadlineIndicator deadline={row.deadline} closedAt={row.completion_date} />
      ),
    },
    {
      key: 'responsible_user',
      label: 'Responsable',
      render: (row) => <span className="text-sm">{row.responsible_user?.full_name || '-'}</span>,
    },
    {
      key: 'budget_allocated',
      label: 'Budget',
      align: 'right',
      render: (row) => (
        <span className="text-sm">{row.budget_allocated ? formatCurrency(row.budget_allocated) : '-'}</span>
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
            navigate(`/action-plans/${row.id}`);
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  if (embedded) {
    return (
      <DataTable<ActionPlan>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/action-plans/${row.id}`)}
        emptyMessage="Aucun plan d'action"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Plans d'action</h1>
          <p className="text-sm text-banking-muted">
            {data?.total ?? 0} plan{(data?.total ?? 0) !== 1 ? 's' : ""}
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
          {canCreateActionPlan && (
            <Button
              size="sm"
              onClick={() => navigate('/action-plans/new')}
              leftIcon={<Plus size={14} />}
            >
              Nouveau plan
            </Button>
          )}
        </div>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={(key, value) => {
          setFilters((prev) => ({ ...prev, [key]: value }));
          setPage(1);
        }}
        onReset={() => {
          setFilters({});
          setSearch('');
          setPage(1);
        }}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher un plan d'action..."
      />

      <DataTable<ActionPlan>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onRowClick={(row) => navigate(`/action-plans/${row.id}`)}
        emptyMessage="Aucun plan d'action trouvé"
      />
    </div>
  );
};
