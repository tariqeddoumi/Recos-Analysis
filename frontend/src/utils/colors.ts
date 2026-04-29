import { RecommendationStatus, ActionStatus, EvidenceStatus, PriorityLevel, CriticalityClass } from '../types';

export const statusColors: Record<RecommendationStatus, { bg: string; text: string; border: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Brouillon' },
  open: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Ouverte' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'En cours' },
  pending_validation: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'En validation' },
  validated: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', label: 'Validée' },
  closed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Clôturée' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Rejetée' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400', label: 'En retard' },
};

export const actionStatusColors: Record<ActionStatus, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'En attente' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'En cours' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Complété' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', label: 'Annulé' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'En retard' },
};

export const evidenceStatusColors: Record<EvidenceStatus, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'En attente' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Soumis' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Approuvé' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Rejeté' },
};

export const priorityColors: Record<PriorityLevel, { bg: string; text: string; border: string; label: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Faible' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Moyen' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Élevé' },
  very_high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Très élevé' },
  critical: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Critique' },
};

export const criticalityColors: Record<CriticalityClass, { bg: string; text: string; score: string; label: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-800', score: 'bg-green-500', label: 'Faible' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', score: 'bg-yellow-500', label: 'Modéré' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', score: 'bg-orange-500', label: 'Élevé' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', score: 'bg-red-600', label: 'Critique' },
};

export const getCriticalityClass = (score: number): CriticalityClass => {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
};

export const getDeadlineColor = (daysRemaining: number): string => {
  if (daysRemaining < 0) return 'text-red-600';
  if (daysRemaining <= 7) return 'text-orange-600';
  if (daysRemaining <= 30) return 'text-yellow-600';
  return 'text-green-600';
};

export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-yellow-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

// Chart colors
export const CHART_COLORS = {
  primary: '#1e3a5f',
  secondary: '#2563eb',
  accent: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  critical: '#7c3aed',
  muted: '#94a3b8',
  draft: '#9ca3af',
  open: '#3b82f6',
  in_progress: '#f59e0b',
  pending_validation: '#f97316',
  validated: '#14b8a6',
  closed: '#22c55e',
  rejected: '#ef4444',
  overdue: '#dc2626',
};
