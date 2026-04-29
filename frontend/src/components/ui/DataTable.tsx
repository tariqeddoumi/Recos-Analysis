import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  keyField?: string;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string | number>;
  onRowSelect?: (id: string | number, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  showCheckboxes?: boolean;
  stickyHeader?: boolean;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T = any>({
  columns,
  data,
  isLoading = false,
  total = 0,
  page = 1,
  limit = 25,
  onPageChange,
  onLimitChange,
  onSort,
  sortKey,
  sortOrder,
  keyField = 'id',
  emptyMessage,
  rowClassName,
  onRowClick,
  selectedRows,
  onRowSelect,
  onSelectAll,
  showCheckboxes = false,
  stickyHeader = false,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit);

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown size={14} className="opacity-40" />;
    if (sortOrder === 'asc') return <ChevronUp size={14} />;
    return <ChevronDown size={14} />;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSelected = data.length > 0 && selectedRows && data.every((row) => selectedRows.has((row as any)[keyField] as string | number));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-banking-border shadow-card bg-white">
        <table className="min-w-full divide-y divide-banking-border">
          <thead className={clsx('bg-gray-50', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {showCheckboxes && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-xs font-semibold text-banking-muted uppercase tracking-wider whitespace-nowrap',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.sortable && 'cursor-pointer select-none hover:text-banking-text transition-colors',
                    col.width
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && getSortIcon(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-banking-border">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (showCheckboxes ? 1 : 0)} className="px-4 py-4">
                  <TableSkeleton rows={5} cols={columns.length} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showCheckboxes ? 1 : 0)} className="px-4 py-4">
                  <EmptyState
                    title="Aucun résultat"
                    description={emptyMessage || 'Aucune donnée trouvée pour les filtres sélectionnés.'}
                    compact
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rowAny = row as any;
                return (
                <tr
                  key={String(rowAny[keyField]) || rowIndex}
                  className={clsx(
                    'transition-colors',
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                    onRowClick && 'cursor-pointer hover:bg-primary-50',
                    rowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {showCheckboxes && (
                    <td
                      className="w-10 px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows?.has(rowAny[keyField] as string | number) || false}
                        onChange={(e) =>
                          onRowSelect?.(rowAny[keyField] as string | number, e.target.checked)
                        }
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-sm text-banking-text',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : (rowAny[col.key] as React.ReactNode) || '-'}
                    </td>
                  ))}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(onPageChange || onLimitChange) && !isLoading && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-banking-muted">
            <span>
              {total > 0
                ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} sur ${total}`
                : '0 résultat'}
            </span>
            {onLimitChange && (
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="rounded-lg border border-banking-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {LIMIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / page
                  </option>
                ))}
              </select>
            )}
          </div>
          {onPageChange && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-banking-border p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={clsx(
                      'min-w-8 rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
                      page === p
                        ? 'border-primary bg-primary text-white'
                        : 'border-banking-border text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-banking-border p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
