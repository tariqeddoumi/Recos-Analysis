import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, BarChart2, Table, Filter, RefreshCw } from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { missionService } from '../../services/mission.service';
import { actionPlanService } from '../../services/actionPlan.service';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { DeadlineIndicator } from '../../components/recommendations/DeadlineIndicator';
import { Recommendation, Mission, ActionPlan } from '../../types';
import { exportRecommendationsToExcel, exportMissionsToExcel, exportActionPlansToExcel } from '../../utils/exportUtils';
import { formatDate, formatPercent } from '../../utils/formatters';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type ReportType = 'recommendations' | 'missions' | 'action_plans' | 'overdue' | 'regulatory';

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'recommendations',
    label: 'Recommandations',
    description: 'Liste complète des recommandations avec filtres',
    icon: <FileText size={20} />,
  },
  {
    id: 'missions',
    label: 'Missions',
    description: 'Rapport des missions et leur état d\'avancement',
    icon: <BarChart2 size={20} />,
  },
  {
    id: 'action_plans',
    label: "Plans d'action",
    description: 'Suivi des plans d\'action et leur progression',
    icon: <Table size={20} />,
  },
  {
    id: 'overdue',
    label: 'Recommandations en retard',
    description: 'Toutes les recommandations dont l\'échéance est dépassée',
    icon: <Filter size={20} className="text-red-500" />,
  },
  {
    id: 'regulatory',
    label: 'Recommandations réglementaires',
    description: 'Suivi spécifique des recommandations réglementaires',
    icon: <Filter size={20} className="text-orange-500" />,
  },
];

const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    type: 'select',
    options: [
      { value: 'draft', label: 'Brouillon' },
      { value: 'open', label: 'Ouverte' },
      { value: 'in_progress', label: 'En cours' },
      { value: 'closed', label: 'Clôturée' },
    ],
  },
  { key: 'date_from', label: 'Du', type: 'date' },
  { key: 'date_to', label: 'Au', type: 'date' },
];

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('recommendations');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(1);

  const queryFilters = {
    ...filters,
    is_overdue: selectedReport === 'overdue' ? true : undefined,
    is_regulatory: selectedReport === 'regulatory' ? true : undefined,
  };

  const { data: recoData, isLoading: loadingRecos } = useQuery({
    queryKey: ['report-recommendations', page, queryFilters],
    queryFn: () => recommendationService.getAll({ page, limit: 25, ...queryFilters }),
    enabled: selectedReport === 'recommendations' || selectedReport === 'overdue' || selectedReport === 'regulatory',
  });

  const { data: missionData, isLoading: loadingMissions } = useQuery({
    queryKey: ['report-missions', page, filters],
    queryFn: () => missionService.getAll({ page, limit: 25, ...filters }),
    enabled: selectedReport === 'missions',
  });

  const { data: actionData, isLoading: loadingActions } = useQuery({
    queryKey: ['report-actions', page, filters],
    queryFn: () => actionPlanService.getAll({ page, limit: 25, ...filters }),
    enabled: selectedReport === 'action_plans',
  });

  const handleExport = async () => {
    try {
      if (selectedReport === 'recommendations' || selectedReport === 'overdue' || selectedReport === 'regulatory') {
        const all = await recommendationService.getAll({ limit: 10000, ...queryFilters });
        exportRecommendationsToExcel(all.data, `rapport-recommandations-${selectedReport}.xlsx`);
      } else if (selectedReport === 'missions') {
        const all = await missionService.getAll({ limit: 10000, ...filters });
        exportMissionsToExcel(all.data, 'rapport-missions.xlsx');
      } else if (selectedReport === 'action_plans') {
        const all = await actionPlanService.getAll({ limit: 10000, ...filters });
        exportActionPlansToExcel(all.data, 'rapport-plans-action.xlsx');
      }
      toast.success('Export Excel généré');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const recoColumns: Column<Recommendation>[] = [
    { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.code}</span> },
    { key: 'constat', label: 'Constat', render: (r) => <span className="text-sm">{r.constat?.substring(0, 60)}...</span> },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'priority', label: 'Priorité', render: (r) => r.risk_qualification?.priority ? <PriorityBadge priority={r.risk_qualification.priority} /> : null },
    { key: 'progress_rate', label: 'Avancement', render: (r) => <ProgressBar value={r.progress_rate} showLabel size="xs" className="w-20" /> },
    { key: 'effective_deadline', label: 'Échéance', render: (r) => <DeadlineIndicator deadline={r.effective_deadline} closedAt={r.closure_date} /> },
  ];

  const missionColumns: Column<Mission>[] = [
    { key: 'reference', label: 'Réf.', render: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.reference}</span> },
    { key: 'title', label: 'Titre', render: (r) => <span className="text-sm font-medium">{r.title}</span> },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'recommendations_count', label: 'Recs.', align: 'center', render: (r) => <span className="text-sm">{r.recommendations_count ?? 0}</span> },
    { key: 'progress_rate', label: 'Avancement', render: (r) => <ProgressBar value={r.progress_rate ?? 0} showLabel size="xs" className="w-20" /> },
    { key: 'start_date', label: 'Début', render: (r) => <span className="text-sm">{formatDate(r.start_date)}</span> },
  ];

  const actionColumns: Column<ActionPlan>[] = [
    { key: 'title', label: 'Titre', render: (r) => <span className="text-sm font-medium">{r.title}</span> },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} type="action" /> },
    { key: 'progress_rate', label: 'Avancement', render: (r) => <ProgressBar value={r.progress_rate} showLabel size="xs" className="w-20" /> },
    { key: 'deadline', label: 'Échéance', render: (r) => <DeadlineIndicator deadline={r.deadline} closedAt={r.completion_date} /> },
    { key: 'responsible_user', label: 'Responsable', render: (r) => <span className="text-sm">{r.responsible_user?.full_name || '-'}</span> },
  ];

  const isLoading = loadingRecos || loadingMissions || loadingActions;
  const total = recoData?.total || missionData?.total || actionData?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Reporting & Exports</h1>
          <p className="text-sm text-banking-muted">Générez et exportez vos rapports</p>
        </div>
        <Button onClick={handleExport} leftIcon={<Download size={14} />}>
          Exporter Excel
        </Button>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((rt) => (
          <Card
            key={rt.id}
            padding="sm"
            hover
            onClick={() => {
              setSelectedReport(rt.id);
              setPage(1);
            }}
            className={clsx(
              'cursor-pointer transition-all',
              selectedReport === rt.id && 'border-secondary ring-2 ring-blue-100'
            )}
          >
            <div className={clsx('mb-2', selectedReport === rt.id ? 'text-secondary' : 'text-banking-muted')}>
              {rt.icon}
            </div>
            <p className={clsx('text-sm font-semibold', selectedReport === rt.id ? 'text-secondary' : 'text-banking-text')}>
              {rt.label}
            </p>
            <p className="text-xs text-banking-muted mt-0.5 hidden md:block">{rt.description}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
        searchPlaceholder="Filtrer les résultats..."
      />

      {/* Results */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-banking-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-banking-text">
              {REPORT_TYPES.find((r) => r.id === selectedReport)?.label}
            </h2>
            <p className="text-xs text-banking-muted">{total} résultat{total !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="ghost" size="xs" onClick={() => setPage(1)} leftIcon={<RefreshCw size={12} />}>
            Actualiser
          </Button>
        </div>
        <div className="p-4">
          {(selectedReport === 'recommendations' || selectedReport === 'overdue' || selectedReport === 'regulatory') && (
            <DataTable<Recommendation>
              columns={recoColumns}
              data={recoData?.data ?? []}
              isLoading={loadingRecos}
              total={recoData?.total ?? 0}
              page={page}
              limit={25}
              onPageChange={setPage}
            />
          )}
          {selectedReport === 'missions' && (
            <DataTable<Mission>
              columns={missionColumns}
              data={missionData?.data ?? []}
              isLoading={loadingMissions}
              total={missionData?.total ?? 0}
              page={page}
              limit={25}
              onPageChange={setPage}
            />
          )}
          {selectedReport === 'action_plans' && (
            <DataTable<ActionPlan>
              columns={actionColumns}
              data={actionData?.data ?? []}
              isLoading={loadingActions}
              total={actionData?.total ?? 0}
              page={page}
              limit={25}
              onPageChange={setPage}
            />
          )}
        </div>
      </Card>
    </div>
  );
};
