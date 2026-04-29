import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import { dashboardService } from '../services/dashboard.service';
import { KpiCard } from '../components/dashboard/KpiCard';
import { ChartBySource } from '../components/dashboard/ChartBySource';
import { ChartByStatus } from '../components/dashboard/ChartByStatus';
import { TrendChart } from '../components/dashboard/TrendChart';
import { CriticalTable } from '../components/dashboard/CriticalTable';
import { DeadlineCalendar } from '../components/dashboard/DeadlineCalendar';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DeadlineIndicator } from '../components/recommendations/DeadlineIndicator';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import { formatPercent, truncateText } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 5 * 60 * 1000,
  });

  const kpis = dashboardData?.kpis;
  const myTasks = dashboardData?.my_tasks;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-banking-text">
          Bonjour, {user?.first_name} 👋
        </h1>
        <p className="text-sm text-banking-muted mt-0.5">
          Voici un aperçu de votre tableau de bord
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              title="Total recommandations"
              value={kpis?.total_recommendations ?? 0}
              icon={<FileText size={20} />}
              onClick={() => navigate('/recommendations')}
              variant="default"
            />
            <KpiCard
              title="Ouvertes"
              value={kpis?.open_recommendations ?? 0}
              icon={<Activity size={20} />}
              variant="primary"
              onClick={() => navigate('/recommendations?status=open')}
            />
            <KpiCard
              title="En retard"
              value={kpis?.overdue_recommendations ?? 0}
              icon={<AlertTriangle size={20} />}
              variant="danger"
              onClick={() => navigate('/recommendations?is_overdue=true')}
            />
            <KpiCard
              title="Critiques"
              value={kpis?.critical_recommendations ?? 0}
              icon={<ShieldAlert size={20} />}
              variant="critical"
              onClick={() => navigate('/recommendations?priority=critical')}
            />
            <KpiCard
              title="Taux de clôture"
              value={formatPercent(kpis?.closure_rate)}
              icon={<CheckCircle2 size={20} />}
              variant="success"
            />
            <KpiCard
              title="Avancement moyen"
              value={formatPercent(kpis?.average_progress)}
              icon={<TrendingUp size={20} />}
              variant="warning"
            />
          </>
        )}
      </div>

      {/* My Tasks + Deadlines */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* My tasks */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-banking-text">Mes recommandations</h2>
                <span className="ml-auto text-xs text-banking-muted">
                  {myTasks?.my_recommendations?.length ?? 0} en cours
                </span>
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : myTasks?.my_recommendations?.length === 0 ? (
                <p className="text-sm text-banking-muted py-4 text-center">
                  Aucune recommandation assignée
                </p>
              ) : (
                <div className="space-y-3">
                  {myTasks?.my_recommendations?.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-banking-border hover:border-secondary hover:bg-primary-50 cursor-pointer transition-all"
                      onClick={() => navigate(`/recommendations/${rec.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-primary font-medium">{rec.code}</span>
                          <StatusBadge status={rec.status} />
                        </div>
                        <p className="text-sm text-banking-text truncate">
                          {truncateText(rec.constat, 80)}
                        </p>
                        <ProgressBar
                          value={rec.progress_rate}
                          className="mt-2"
                          size="xs"
                          showLabel
                        />
                      </div>
                      <DeadlineIndicator
                        deadline={rec.effective_deadline}
                        closedAt={rec.closure_date}
                        showDate={false}
                      />
                    </div>
                  ))}
                  {(myTasks?.my_recommendations?.length ?? 0) > 5 && (
                    <button
                      onClick={() => navigate('/recommendations')}
                      className="text-xs text-secondary hover:text-blue-700 transition-colors"
                    >
                      Voir toutes mes recommandations →
                    </button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Regulatory alerts */}
          {dashboardData?.regulatory_alerts && dashboardData.regulatory_alerts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-orange-500" />
                  <h2 className="text-sm font-semibold text-banking-text">
                    Alertes réglementaires
                  </h2>
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1 text-xs font-bold text-orange-700">
                    {dashboardData.regulatory_alerts.length}
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {dashboardData.regulatory_alerts.slice(0, 3).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100 cursor-pointer hover:border-orange-300 transition-colors"
                      onClick={() => navigate(`/recommendations/${rec.id}`)}
                    >
                      <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-primary font-medium">{rec.code}</p>
                        <p className="text-sm text-banking-text truncate">
                          {truncateText(rec.constat, 70)}
                        </p>
                      </div>
                      <StatusBadge status={rec.status} />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Upcoming deadlines */}
        <DeadlineCalendar tasks={myTasks} isLoading={isLoading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartBySource
            data={dashboardData?.by_source ?? []}
            isLoading={isLoading}
          />
        </div>
        <ChartByStatus
          data={dashboardData?.by_status ?? []}
          isLoading={isLoading}
        />
      </div>

      <TrendChart
        data={dashboardData?.trend ?? []}
        isLoading={isLoading}
      />

      {/* Critical recommendations */}
      <CriticalTable
        data={dashboardData?.critical_recommendations ?? []}
        isLoading={isLoading}
      />
    </div>
  );
};
