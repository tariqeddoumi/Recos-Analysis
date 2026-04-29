import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { SourceType, SourceTypeForm } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sourceTypeSchema } from '../../utils/validators';
import clsx from 'clsx';

export const Sources: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceType | null>(null);
  const [deletingSource, setDeletingSource] = useState<SourceType | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['source-types'],
    queryFn: () => adminService.getSourceTypes(),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<SourceTypeForm>({
    resolver: zodResolver(sourceTypeSchema),
  });

  const { mutate: save } = useMutation({
    mutationFn: (data: SourceTypeForm) =>
      editingSource
        ? adminService.updateSourceType(editingSource.id, data)
        : adminService.createSourceType(data),
    onSuccess: () => {
      toast.success(editingSource ? 'Source mise à jour' : 'Source créée');
      queryClient.invalidateQueries({ queryKey: ['source-types'] });
      setShowForm(false);
      setEditingSource(null);
      reset();
    },
    onError: () => toast.error('Erreur'),
  });

  const { mutate: deleteSource, isPending: deleting } = useMutation({
    mutationFn: (id: number) => adminService.deleteSourceType(id),
    onSuccess: () => {
      toast.success('Source supprimée');
      queryClient.invalidateQueries({ queryKey: ['source-types'] });
      setDeletingSource(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const openEdit = (source: SourceType) => {
    setEditingSource(source);
    reset({
      code: source.code,
      label: source.label,
      category: source.category,
      is_regulatory: source.is_regulatory,
      is_active: source.is_active,
      description: source.description,
    });
    setShowForm(true);
  };

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Types de sources</h1>
          <p className="text-sm text-banking-muted">{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingSource(null); reset({ is_active: true, is_regulatory: false }); setShowForm(true); }}>
          Nouvelle source
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-banking-border bg-white shadow-card">
        <table className="min-w-full divide-y divide-banking-border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Libellé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Catégorie</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Réglementaire</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-banking-border">
            {sources.map((source, i) => (
              <tr key={source.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 text-xs font-mono font-semibold text-primary">{source.code}</td>
                <td className="px-4 py-3 text-sm font-medium text-banking-text">{source.label}</td>
                <td className="px-4 py-3 text-sm text-banking-muted">{source.category}</td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    source.is_regulatory ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {source.is_regulatory ? 'Oui' : 'Non'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    source.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {source.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(source)} className="p-1.5 rounded text-gray-400 hover:text-secondary hover:bg-blue-50">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingSource(source)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingSource ? 'Modifier la source' : 'Nouvelle source'} size="md">
        <form onSubmit={handleSubmit((d) => save(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" error={errors.code?.message} required>
              <Input {...register('code')} error={!!errors.code} placeholder="EX: AUDIT_INT" />
            </FormField>
            <FormField label="Catégorie" error={errors.category?.message} required>
              <Input {...register('category')} error={!!errors.category} placeholder="Ex: Audit" />
            </FormField>
          </div>
          <FormField label="Libellé" error={errors.label?.message} required>
            <Input {...register('label')} error={!!errors.label} placeholder="Libellé de la source" />
          </FormField>
          <FormField label="Description">
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('is_regulatory')} className="rounded border-gray-300 text-primary" />
              <span className="text-sm">Réglementaire</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('is_active')} className="rounded border-gray-300 text-primary" />
              <span className="text-sm">Actif</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingSource ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingSource}
        onClose={() => setDeletingSource(null)}
        onConfirm={() => deletingSource && deleteSource(deletingSource.id)}
        title="Supprimer la source"
        message={`Êtes-vous sûr de vouloir supprimer la source "${deletingSource?.label}" ?`}
        isLoading={deleting}
      />
    </div>
  );
};
