import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { Entity, EntityForm } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entitySchema } from '../../utils/validators';
import clsx from 'clsx';

export const Entities: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<Entity | null>(null);

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: () => adminService.getEntities(),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<EntityForm>({
    resolver: zodResolver(entitySchema),
  });

  const { mutate: save } = useMutation({
    mutationFn: (data: EntityForm) =>
      editingEntity
        ? adminService.updateEntity(editingEntity.id, data)
        : adminService.createEntity(data),
    onSuccess: () => {
      toast.success(editingEntity ? 'Entité mise à jour' : 'Entité créée');
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setShowForm(false);
      setEditingEntity(null);
      reset();
    },
    onError: () => toast.error('Erreur'),
  });

  const { mutate: deleteEntity, isPending: deleting } = useMutation({
    mutationFn: (id: number) => adminService.deleteEntity(id),
    onSuccess: () => {
      toast.success('Entité supprimée');
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setDeletingEntity(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const openEdit = (entity: Entity) => {
    setEditingEntity(entity);
    reset({
      code: entity.code,
      label: entity.label,
      type: entity.type,
      parent_id: entity.parent_id,
      is_active: entity.is_active,
    });
    setShowForm(true);
  };

  if (isLoading) return <LoadingSpinner fullPage />;

  const ENTITY_TYPES = ['direction', 'département', 'service', 'division', 'filiale', 'agence'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Gestion des entités</h1>
          <p className="text-sm text-banking-muted">{entities.length} entité{entities.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingEntity(null); reset({ is_active: true }); setShowForm(true); }}>
          Nouvelle entité
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-banking-border bg-white shadow-card">
        <table className="min-w-full divide-y divide-banking-border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Libellé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-banking-muted uppercase">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-banking-border">
            {entities.map((entity, i) => (
              <tr key={entity.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-400" />
                    <span className="text-xs font-mono font-semibold text-primary">{entity.code}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-banking-text">
                  {entity.parent_id ? <span className="ml-4">└ </span> : null}
                  {entity.label}
                </td>
                <td className="px-4 py-3 text-sm text-banking-muted capitalize">{entity.type}</td>
                <td className="px-4 py-3 text-sm text-banking-muted">{entity.parent?.label || '-'}</td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    entity.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {entity.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(entity)} className="p-1.5 rounded text-gray-400 hover:text-secondary hover:bg-blue-50">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingEntity(entity)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingEntity ? 'Modifier l\'entité' : 'Nouvelle entité'}>
        <form onSubmit={handleSubmit((d) => save(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" error={errors.code?.message} required>
              <Input {...register('code')} error={!!errors.code} placeholder="EX: DIR_FIN" />
            </FormField>
            <FormField label="Type" error={errors.type?.message} required>
              <Select
                {...register('type')}
                error={!!errors.type}
                placeholder="Sélectionner"
                options={ENTITY_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              />
            </FormField>
          </div>
          <FormField label="Libellé" error={errors.label?.message} required>
            <Input {...register('label')} error={!!errors.label} placeholder="Nom de l'entité" />
          </FormField>
          <FormField label="Entité parente">
            <Select
              {...register('parent_id', { valueAsNumber: true })}
              placeholder="Aucune (entité racine)"
              options={entities.filter((e) => e.id !== editingEntity?.id).map((e) => ({ value: e.id, label: e.label }))}
            />
          </FormField>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('is_active')} className="rounded border-gray-300 text-primary" />
            <span className="text-sm">Entité active</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingEntity ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingEntity}
        onClose={() => setDeletingEntity(null)}
        onConfirm={() => deletingEntity && deleteEntity(deletingEntity.id)}
        title="Supprimer l'entité"
        message={`Supprimer "${deletingEntity?.label}" ? Cette action peut affecter les recommandations liées.`}
        isLoading={deleting}
      />
    </div>
  );
};
