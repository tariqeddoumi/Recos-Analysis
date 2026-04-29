import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { AuditLog } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime } from '../../utils/formatters';
import { downloadBlob } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const ACTION_COLORS: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  status_change: 'warning',
  login: 'default',
  logout: 'default',
  export: 'info',
  upload: 'info',
  download: 'default',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  status_change: 'Changement statut',
  login: 'Connexion',
  logout: 'Déconnexion',
  export: 'Export',
  upload: 'Téléversement',
  download: 'Téléchargement',
};

const filterConfigs: FilterConfig[] = [
  {
    key: 'action',
    label: 'Action',
    type: 'select',
    options: Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v })),
  },
  {
    key: 'module',
    label: 'Module',
    type: 'select',
    options: [
      { value: 'auth', label: 'Authentification' },
      { value: 'mission', label: 'Missions' },
      { value: 'recommendation', label: 'Recommandations' },
      { value: 'action_plan', label: "Plans d'action" },
      { value: 'evidence', label: 'Preuves' },
      { value: 'user', label: 'Utilisateurs' },
      { value: 'admin', label: 'Administration' },
      { value: 'report', label: 'Rapports' },
    ],
  },
  { key: 'date_from', label: 'Du', type: 'date' },
  { key: 'date_to', label: 'Au', type: 'date' },
];

const ExpandableRow: React.FC<{ log: AuditLog }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <button className="text-gray-400">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-banking-muted">{formatDateTime(log.created_at)}</td>
        <td className="px-4 py-3 text-sm font-medium text-banking-text">{log.user?.full_name || 'Système'}</td>
        <td className="px-4 py-3">
          <Badge variant={ACTION_COLORS[log.action] || 'default'} size="sm">
            {ACTION_LABELS[log.action] || log.action}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-medium text-banking-muted uppercase">{log.module}</span>
        </td>
        <td className="px-4 py-3 text-sm text-banking-text">{log.entity_label || log.entity_type || '-'}</td>
        <td className="px-4 py-3 text-sm text-banking-text max-w-64">
          <span className="line-clamp-2">{log.description}</span>
        </td>
        <td className="px-4 py-3 text-xs text-banking-muted">{log.ip_address || '-'}</td>
      </tr>
      {expanded && (log.old_values || log.new_values) && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {log.old_values && (
                <div>
                  <p className="text-xs font-semibold text-banking-muted mb-2 uppercase">Avant</p>
                  <pre className="text-xs text-banking-text bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-40">
                    {JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_values && (
                <div>
                  <p className="text-xs font-semibold text-banking-muted mb-2 uppercase">Après</p>
                  <pre className="text-xs text-banking-text bg-green-50 border border-green-100 rounded-lg p-3 overflow-auto max-h-40">
                    {JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, limit, search, filters],
    queryFn: () =>
      adminService.getAuditLogs({
        page,
        limit,
        search: search || undefined,
        ...filters,
      }),
  });

  const handleExport = async () => {
    try {
      const blob = await adminService.exportAuditLogs({ ...filters });
      downloadBlob(blob, 'journal-audit.xlsx');
      toast.success('Export réussi');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Journal d'audit</h1>
          <p className="text-sm text-banking-muted">{data?.total ?? 0} entrée{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport}>
          Exporter
        </Button>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); }}
        onReset={() => { setFilters({}); setSearch(''); setPage(1); }}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher dans l'audit..."
      />

      <div className="overflow-x-auto rounded-xl border border-banking-border shadow-card bg-white">
        <table className="min-w-full divide-y divide-banking-border">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Entité</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-banking-border">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-banking-muted">
                  Chargement...
                </td>
              </tr>
            ) : !data?.data || data.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-banking-muted">
                  Aucune entrée dans le journal d'audit
                </td>
              </tr>
            ) : (
              data.data.map((log) => <ExpandableRow key={log.id} log={log} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-banking-muted">
            {(page - 1) * limit + 1}–{Math.min(page * limit, data?.total ?? 0)} sur {data?.total ?? 0}
          </span>
          <div className="flex gap-2">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <Button size="xs" variant="ghost" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
