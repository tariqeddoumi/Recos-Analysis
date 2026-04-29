import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Recommendation, ActionPlan, Mission } from '../types';
import { formatDate, formatPercent } from './formatters';
import { statusColors, priorityColors } from './colors';

export const exportRecommendationsToExcel = (recommendations: Recommendation[], filename = 'recommandations.xlsx') => {
  const data = recommendations.map((r) => ({
    'Code': r.code,
    'Mission': r.mission?.title || '-',
    'Source': r.source_type?.label || '-',
    'Entité': r.entity?.label || '-',
    'Constat': r.constat,
    'Recommandation': r.recommendation_text,
    'Statut': statusColors[r.status]?.label || r.status,
    'Priorité': priorityColors[r.risk_qualification?.priority]?.label || '-',
    'Score criticité': r.risk_qualification?.criticality_score || '-',
    'Échéance': formatDate(r.effective_deadline),
    'Avancement': formatPercent(r.progress_rate),
    'Responsable': r.responsible_user?.full_name || '-',
    'Réglementaire': r.is_regulatory ? 'Oui' : 'Non',
    'Date création': formatDate(r.created_at),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recommandations');

  // Auto-width columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  ws['!cols'] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};

export const exportActionPlansToExcel = (actionPlans: ActionPlan[], filename = 'plans-action.xlsx') => {
  const data = actionPlans.map((a) => ({
    'Titre': a.title,
    'Recommandation': a.recommendation?.code || '-',
    'Statut': a.status,
    'Responsable': a.responsible_user?.full_name || '-',
    'Date début': formatDate(a.start_date),
    'Échéance': formatDate(a.deadline),
    'Avancement': formatPercent(a.progress_rate),
    'Budget alloué': a.budget_allocated || '-',
    'Budget consommé': a.budget_consumed || '-',
    'Date création': formatDate(a.created_at),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plans d\'action');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};

export const exportMissionsToExcel = (missions: Mission[], filename = 'missions.xlsx') => {
  const data = missions.map((m) => ({
    'Référence': m.reference,
    'Titre': m.title,
    'Type': m.type,
    'Source': m.source_type?.label || '-',
    'Entité': m.entity?.label || '-',
    'Statut': m.status,
    'Date début': formatDate(m.start_date),
    'Date fin': formatDate(m.end_date),
    'Recommandations': m.recommendations_count || 0,
    'Avancement': formatPercent(m.progress_rate),
    'Manager': m.manager?.full_name || '-',
    'Date création': formatDate(m.created_at),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Missions');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  saveAs(blob, filename);
};
