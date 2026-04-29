import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { ReminderRule } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';

export const ReminderRules: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<ReminderRule | null>(null);

  const [formData, setFormData] = useState<Partial<ReminderRule>>({
    name: '',
    entity_type: 'recommendation',
    trigger_type: 'before_deadline',
    days_offset: 7,
    notification_type: 'deadline_approaching',
    recipients: [],
    is_active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['reminder-rules'],
    queryFn: () => adminService.getReminderRules(),
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Omit<ReminderRule, 'id' | 'created_at'>) =>
      editingRule
        ? adminService.updateReminderRule(editingRule.id, data)
        : adminService.createReminderRule(data),
    onSuccess: () => {
      toast.success(editingRule ? 'Règle mise à jour' : 'Règle créée');
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      setShowForm(false);
      setEditingRule(null);
    },
    onError: () => toast.error('Erreur'),
  });

  const { mutate: deleteRule, isPending: deleting } = useMutation({
    mutationFn: (id: number) => adminService.deleteReminderRule(id),
    onSuccess: () => {
      toast.success('Règle supprimée');
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      setDeletingRule(null);
    },
    onError: () => toast.error('Erreur'),
  });

  if (isLoading) return <LoadingSpinner fullPage />;

  const TRIGGER_LABELS: Record<string, string> = {
    before_deadline: 'Avant l\'échéance',
    after_deadline: 'Après l\'échéance',
    status_change: 'Changement de statut',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Règles de rappel</h1>
          <p className="text-sm text-banking-muted">{rules.length} règle{rules.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingRule(null); setShowForm(true); }}>
          Nouvelle règle
        </Button>
      </div>

      <div className="grid gap-3">
        {rules.map((rule) => (
          <Card key={rule.id} padding="sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={clsx('h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center',
                  rule.is_active ? 'bg-primary-50 text-primary' : 'bg-gray-100 text-gray-400'
                )}>
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-banking-text">{rule.name}</p>
                  <p className="text-xs text-banking-muted mt-0.5">
                    {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                    {rule.days_offset !== undefined && (
                      <span> ({rule.days_offset} jours)</span>
                    )}
                    {' • '}
                    {rule.entity_type}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rule.recipients.map((r, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                  rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => setEditingRule(rule)} className="p-1.5 rounded text-gray-400 hover:text-secondary hover:bg-blue-50">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setDeletingRule(rule)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card>
            <p className="text-sm text-banking-muted text-center py-4">Aucune règle de rappel configurée</p>
          </Card>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingRule ? 'Modifier la règle' : 'Nouvelle règle'} size="md">
        <div className="space-y-4">
          <FormField label="Nom de la règle" required>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Rappel J-7 avant échéance"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type d'entité">
              <Select
                value={formData.entity_type || 'recommendation'}
                onChange={(e) => setFormData((p) => ({ ...p, entity_type: e.target.value }))}
                options={[
                  { value: 'recommendation', label: 'Recommandation' },
                  { value: 'action_plan', label: "Plan d'action" },
                ]}
              />
            </FormField>
            <FormField label="Déclencheur">
              <Select
                value={formData.trigger_type || 'before_deadline'}
                onChange={(e) => setFormData((p) => ({ ...p, trigger_type: e.target.value as ReminderRule['trigger_type'] }))}
                options={[
                  { value: 'before_deadline', label: 'Avant l\'échéance' },
                  { value: 'after_deadline', label: 'Après l\'échéance' },
                  { value: 'status_change', label: 'Changement de statut' },
                ]}
              />
            </FormField>
          </div>
          {(formData.trigger_type === 'before_deadline' || formData.trigger_type === 'after_deadline') && (
            <FormField label="Délai (jours)">
              <Input
                type="number"
                value={formData.days_offset || 7}
                onChange={(e) => setFormData((p) => ({ ...p, days_offset: Number(e.target.value) }))}
                min={1}
              />
            </FormField>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active || false}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-primary"
            />
            <span className="text-sm">Règle active</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={() => formData.name && save(formData as Omit<ReminderRule, 'id' | 'created_at'>)}>
              {editingRule ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        onConfirm={() => deletingRule && deleteRule(deletingRule.id)}
        title="Supprimer la règle"
        message={`Supprimer la règle "${deletingRule?.name}" ?`}
        isLoading={deleting}
      />
    </div>
  );
};
