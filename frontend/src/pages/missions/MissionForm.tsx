import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { missionService } from '../../services/mission.service';
import { adminService } from '../../services/admin.service';
import { missionSchema } from '../../utils/validators';
import { MissionForm as FormType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { DatePicker } from '../../components/ui/DatePicker';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const MissionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: mission, isLoading: isLoadingMission } = useQuery({
    queryKey: ['mission', id],
    queryFn: () => missionService.getById(Number(id)),
    enabled: isEdit,
  });

  const { data: sourceTypes = [] } = useQuery({
    queryKey: ['source-types'],
    queryFn: () => adminService.getSourceTypes(),
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
    reset,
  } = useForm<FormType>({
    resolver: zodResolver(missionSchema),
    values: mission
      ? {
          title: mission.title,
          type: mission.type,
          source_type_id: mission.source_type_id,
          entity_id: mission.entity_id,
          start_date: mission.start_date?.split('T')[0] || '',
          end_date: mission.end_date?.split('T')[0] || '',
          report_date: mission.report_date?.split('T')[0] || '',
          description: mission.description || '',
          scope: mission.scope || '',
          manager_id: mission.manager_id,
        }
      : undefined,
  });

  const { mutate } = useMutation({
    mutationFn: (data: FormType) =>
      isEdit
        ? missionService.update(Number(id), data)
        : missionService.create(data),
    onSuccess: (result) => {
      toast.success(isEdit ? 'Mission mise à jour' : 'Mission créée');
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      navigate(`/missions/${result.id}`);
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  if (isEdit && isLoadingMission) return <LoadingSpinner fullPage />;

  const onSubmit = (data: FormType) => {
    const cleaned = {
      ...data,
      source_type_id: Number(data.source_type_id),
      entity_id: Number(data.entity_id),
      manager_id: data.manager_id ? Number(data.manager_id) : undefined,
      end_date: data.end_date || undefined,
      report_date: data.report_date || undefined,
      description: data.description || undefined,
      scope: data.scope || undefined,
    };
    mutate(cleaned);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-banking-text">
          {isEdit ? 'Modifier la mission' : 'Nouvelle mission'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Informations générales</h2>
          <div className="space-y-4">
            <FormField label="Titre" error={errors.title?.message} required>
              <Input
                {...register('title')}
                error={!!errors.title}
                placeholder="Titre de la mission"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Type" error={errors.type?.message} required>
                <Select
                  {...register('type')}
                  error={!!errors.type}
                  placeholder="Sélectionner un type"
                  options={[
                    { value: 'internal_audit', label: 'Audit interne' },
                    { value: 'external_audit', label: 'Audit externe' },
                    { value: 'regulatory', label: 'Réglementaire' },
                    { value: 'inspection', label: 'Inspection' },
                  ]}
                />
              </FormField>

              <FormField label="Source" error={errors.source_type_id?.message} required>
                <Select
                  {...register('source_type_id', { valueAsNumber: true })}
                  error={!!errors.source_type_id}
                  placeholder="Sélectionner une source"
                  options={sourceTypes.map((s) => ({ value: s.id, label: s.label }))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Entité concernée" error={errors.entity_id?.message} required>
                <Select
                  {...register('entity_id', { valueAsNumber: true })}
                  error={!!errors.entity_id}
                  placeholder="Sélectionner une entité"
                  options={entities.map((e) => ({ value: e.id, label: e.label }))}
                />
              </FormField>

              <FormField label="Responsable de mission">
                <Select
                  {...register('manager_id', { valueAsNumber: true })}
                  placeholder="Sélectionner un responsable"
                  options={users?.data.map((u) => ({ value: u.id, label: u.full_name })) || []}
                />
              </FormField>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Calendrier</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Date de début" error={errors.start_date?.message} required>
              <DatePicker {...register('start_date')} error={!!errors.start_date} />
            </FormField>
            <FormField label="Date de fin">
              <DatePicker {...register('end_date')} />
            </FormField>
            <FormField label="Date du rapport">
              <DatePicker {...register('report_date')} />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Description</h2>
          <div className="space-y-4">
            <FormField label="Description">
              <Textarea
                {...register('description')}
                placeholder="Description de la mission..."
                rows={4}
              />
            </FormField>
            <FormField label="Périmètre">
              <Textarea
                {...register('scope')}
                placeholder="Périmètre couvert par cette mission..."
                rows={3}
              />
            </FormField>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={14} />}>
            {isEdit ? 'Enregistrer' : 'Créer la mission'}
          </Button>
        </div>
      </form>
    </div>
  );
};
