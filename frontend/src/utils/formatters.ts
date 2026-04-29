import { format, formatDistanceToNow, differenceInDays, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (date: string | Date | null | undefined, fmt = 'dd/MM/yyyy'): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return format(d, fmt, { locale: fr });
  } catch {
    return '-';
  }
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatRelativeDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  } catch {
    return '-';
  }
};

export const getDaysRemaining = (deadline: string | Date | null | undefined): number => {
  if (!deadline) return 0;
  try {
    const d = typeof deadline === 'string' ? parseISO(deadline) : deadline;
    if (!isValid(d)) return 0;
    return differenceInDays(d, new Date());
  } catch {
    return 0;
  }
};

export const isOverdue = (deadline: string | Date | null | undefined): boolean => {
  return getDaysRemaining(deadline) < 0;
};

export const isNearDeadline = (deadline: string | Date | null | undefined, days = 7): boolean => {
  const remaining = getDaysRemaining(deadline);
  return remaining >= 0 && remaining <= days;
};

export const formatNumber = (value: number | null | undefined, decimals = 0): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const formatCurrency = (value: number | null | undefined, currency = 'EUR'): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const initials = (firstName?: string, lastName?: string): string => {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return `${f}${l}` || '?';
};
