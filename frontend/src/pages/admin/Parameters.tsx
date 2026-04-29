import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Edit2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { Parameter } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../utils/formatters';

const ParameterRow: React.FC<{ param: Parameter; onSave: (id: number, value: string) => void; saving: boolean }> = ({ param, onSave, saving }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(param.value);

  const handleSave = () => {
    onSave(param.id, value);
    setEditing(false);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-banking-text">{param.label}</p>
          <p className="text-xs font-mono text-banking-muted">{param.key}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-banking-muted uppercase">{param.category}</td>
      <td className="px-4 py-3">
        {editing ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
            {param.type === 'boolean' ? (param.value === 'true' ? 'Oui' : 'Non') : param.value}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-banking-muted">{param.description || '-'}</td>
      <td className="px-4 py-3 text-xs text-banking-muted">{formatDateTime(param.updated_at)}</td>
      <td className="px-4 py-3">
        {param.is_editable && (
          editing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded text-green-500 hover:bg-green-50 transition-colors"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setEditing(false); setValue(param.value); }}
                className="p-1.5 rounded text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded text-gray-400 hover:text-secondary hover:bg-blue-50 transition-colors"
            >
              <Edit2 size={14} />
            </button>
          )
        )}
      </td>
    </tr>
  );
};

export const Parameters: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: params = [], isLoading } = useQuery({
    queryKey: ['parameters', selectedCategory],
    queryFn: () => adminService.getParameters(selectedCategory || undefined),
  });

  const { mutate: updateParam, isPending } = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) =>
      adminService.updateParameter(id, value),
    onSuccess: () => {
      toast.success('Paramètre mis à jour');
      queryClient.invalidateQueries({ queryKey: ['parameters'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const categories = [...new Set(params.map((p) => p.category))];

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-banking-text">Paramètres système</h1>
        <p className="text-sm text-banking-muted">Configuration de la plateforme</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
              selectedCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-banking-border shadow-card bg-white">
        <table className="min-w-full divide-y divide-banking-border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Paramètre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Catégorie</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Valeur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Mis à jour</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-banking-border">
            {params.map((param) => (
              <ParameterRow
                key={param.id}
                param={param}
                onSave={(id, value) => updateParam({ id, value })}
                saving={isPending}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
