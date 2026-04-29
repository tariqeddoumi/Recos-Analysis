import React, { useState } from 'react';
import clsx from 'clsx';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'checkbox' | 'daterange';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  className?: string;
  collapsed?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  onSearch,
  searchValue = '',
  searchPlaceholder = 'Rechercher...',
  className,
  collapsed = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const activeCount = Object.values(values).filter((v) => v !== '' && v !== undefined && v !== null && v !== false).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localSearch);
  };

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="flex flex-col gap-1.5 min-w-36">
            <label className="text-xs font-medium text-banking-muted uppercase tracking-wide">
              {filter.label}
            </label>
            <select
              value={String(value || '')}
              onChange={(e) => onChange(filter.key, e.target.value || undefined)}
              className="rounded-lg border border-banking-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-secondary"
            >
              <option value="">Tous</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'date':
        return (
          <div key={filter.key} className="flex flex-col gap-1.5 min-w-36">
            <label className="text-xs font-medium text-banking-muted uppercase tracking-wide">
              {filter.label}
            </label>
            <input
              type="date"
              value={String(value || '')}
              onChange={(e) => onChange(filter.key, e.target.value || undefined)}
              className="rounded-lg border border-banking-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-secondary"
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={filter.key} className="flex items-center gap-2 self-end pb-1.5">
            <input
              type="checkbox"
              id={filter.key}
              checked={Boolean(value)}
              onChange={(e) => onChange(filter.key, e.target.checked || undefined)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor={filter.key} className="text-sm text-banking-text cursor-pointer">
              {filter.label}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={clsx('bg-white rounded-xl border border-banking-border shadow-card', className)}>
      <div className="flex items-center gap-3 p-4">
        {onSearch && (
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
            <Input
              leftIcon={<Search size={14} />}
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </form>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          leftIcon={<Filter size={14} />}
          rightIcon={
            <span className="flex items-center gap-1">
              {activeCount > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  {activeCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={clsx('transition-transform', isExpanded && 'rotate-180')}
              />
            </span>
          }
        >
          Filtres
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<X size={14} />}>
            Réinitialiser
          </Button>
        )}
      </div>

      {isExpanded && filters.length > 0 && (
        <div className="border-t border-banking-border px-4 py-4 flex flex-wrap gap-4 items-start">
          {filters.map(renderFilter)}
        </div>
      )}
    </div>
  );
};
