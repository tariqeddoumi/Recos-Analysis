import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { actionPlanService } from '../../services/actionPlan.service';
import { recommendationService } from '../../services/recommendation.service';
import { adminService } from '../../services/admin.service';
import { actionPlanSchema } from '../../utils/validators';
import { ActionPlanForm as FormType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { DatePicker } from '../../components/ui/DatePicker';

export const ActionPlanForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const recId = searchParams.get('recommendation_id');

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations-list'],
    queryFn: () => recommendationService.getAll({ limit: 100 }),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => adminService.getEntities(),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminService.getUsers({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({
    resolver: zodResolver(actionPlanSchema),
    defaultValues: {
      recommendation_id: recId ? Number(recId) : undefined,
    },
  });

  const { mutate } = useMutation({
    mutationFn: (data: FormType) => actionPlanService.create(data),
    onSuccess: (result) => {
      toast.success("Plan d'action créé");
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      navigate(`/action-plans/${result.id}`);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const onSubmit = (data: FormType) => {
    mutate({
      ...data,
      recommendation_id: Number(data.recommendation_id),
      responsible_user_id: data.responsible_user_id ? Number(data.responsible_user_id) : undefined,
      responsible_entity_id: data.responsible_entity_id ? Number(data.responsible_entity_id) : undefined,
      budget_allocated: data.budget_allocated ? Number(data.budget_allocated) : undefined,
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-banking-text">Nouveau plan d'action</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Informations</h2>
          <div className="space-y-4">
            <FormField label="Recommandation" error={errors.recommendation_id?.message} required>
              <Select
                {...register('recommendation_id', { valueAsNumber: true })}
                error={!!errors.recommendation_id}
                placeholder="Sélectionner une recommandation"
                options={recommendations?.data.map((r) => ({ value: r.id, label: `${r.code} - ${r.constat.substring(0, 50)}...` })) || []}
              />
            </FormField>

            <FormField label="Titre" error={errors.title?.message} required>
              <Input {...register('title')} error={!!errors.title} placeholder="Titre du plan d'action" />
            </FormField>

            <FormField label="Description">
              <Textarea {...register('description')} rows={3} placeholder="Description..." />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Responsables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Responsable">
              <Select
                {...register('responsible_user_id', { valueAsNumber: true })}
                placeholder="Sélectionner"
                options={users?.data.map((u) => ({ value: u.id, label: u.full_name })) || []}
              />
            </FormField>
            <FormField label="Entité responsable">
              <Select
                {...register('responsible_entity_id', { valueAsNumber: true })}
                placeholder="Sélectionner"
                options={entities.map((e) => ({ value: e.id, label: e.label }))}
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Calendrier & Budget</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Date de début">
              <DatePicker {...register('start_date')} />
            </FormField>
            <FormField label="Échéance" error={errors.deadline?.message} required>
              <DatePicker {...register('deadline')} error={!!errors.deadline} />
            </FormField>
            <FormField label="Budget alloué (€)">
              <Input
                type="number"
                {...register('budget_allocated', { valueAsNumber: true })}
                placeholder="0"
              />
            </FormField>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={14} />}>
            Créer le plan d'action
          </Button>
        </div>
      </form>
    </div>
  );
};
