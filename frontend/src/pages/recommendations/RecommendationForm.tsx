import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { recommendationService } from '../../services/recommendation.service';
import { missionService } from '../../services/mission.service';
import { adminService } from '../../services/admin.service';
import { recommendationSchema } from '../../utils/validators';
import { RecommendationForm as FormType, SeverityLevel, ProbabilityLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { DatePicker } from '../../components/ui/DatePicker';
import { RiskQualification } from './RiskQualification';
import clsx from 'clsx';

const STEPS = [
  { id: 1, label: 'Mission & Source', shortLabel: 'Mission' },
  { id: 2, label: 'Constat & Qualification', shortLabel: 'Constat' },
  { id: 3, label: 'Score de risque', shortLabel: 'Risque' },
  { id: 4, label: 'Responsables & Échéances', shortLabel: 'Responsables' },
  { id: 5, label: 'Révision', shortLabel: 'Révision' },
];

export const RecommendationForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [severity, setSeverity] = useState<SeverityLevel>(1);
  const [probability, setProbability] = useState<ProbabilityLevel>(1);
  const [impacts, setImpacts] = useState({
    financial: false,
    regulatory: false,
    operational: false,
    reputational: false,
    strategic: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<FormType>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      is_regulatory: false,
      confidentiality: 'internal',
      impact_financial: false,
      impact_regulatory: false,
      impact_operational: false,
      impact_reputational: false,
      impact_strategic: false,
      severity: 1,
      probability: 1,
    },
  });

  const { data: missions } = useQuery({
    queryKey: ['missions-list'],
    queryFn: () => missionService.getAll({ limit: 100, status: 'active' }),
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

  const { data: riskTypes = [] } = useQuery({
    queryKey: ['risk-types'],
    queryFn: async () => {
      try {
        const resp = await adminService.getSourceTypes();
        return resp;
      } catch {
        return [];
      }
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormType) => recommendationService.create(data),
    onSuccess: (result) => {
      toast.success('Recommandation créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      navigate(`/recommendations/${result.id}`);
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormType)[] = [];
    if (currentStep === 1) fieldsToValidate = ['mission_id', 'source_type_id', 'entity_id'];
    if (currentStep === 2) fieldsToValidate = ['constat', 'recommendation_text'];

    const valid = fieldsToValidate.length === 0 || (await trigger(fieldsToValidate));
    if (valid) setCurrentStep((s) => s + 1);
  };

  const handleImpactChange = (key: string, value: boolean) => {
    setImpacts((prev) => ({ ...prev, [key]: value }));
    setValue(`impact_${key}` as keyof FormType, value as never);
  };

  const onSubmit = (data: FormType) => {
    const finalData = {
      ...data,
      severity,
      probability,
      impact_financial: impacts.financial,
      impact_regulatory: impacts.regulatory,
      impact_operational: impacts.operational,
      impact_reputational: impacts.reputational,
      impact_strategic: impacts.strategic,
      mission_id: Number(data.mission_id),
      source_type_id: Number(data.source_type_id),
      entity_id: Number(data.entity_id),
    };
    mutate(finalData);
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
        <h1 className="text-xl font-bold text-banking-text">Nouvelle recommandation</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                currentStep === step.id
                  ? 'bg-primary text-white'
                  : currentStep > step.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              <span
                className={clsx(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                  currentStep > step.id ? 'bg-green-500 text-white' : ''
                )}
              >
                {currentStep > step.id ? <Check size={10} /> : step.id}
              </span>
              <span className="hidden sm:block">{step.shortLabel}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={clsx('flex-1 h-0.5', currentStep > step.id ? 'bg-green-300' : 'bg-gray-200')} />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Mission & Source */}
        {currentStep === 1 && (
          <Card>
            <h2 className="text-sm font-semibold text-banking-text mb-4">Mission & Source</h2>
            <div className="space-y-4">
              <FormField label="Mission" error={errors.mission_id?.message} required>
                <Select
                  {...register('mission_id', { valueAsNumber: true })}
                  error={!!errors.mission_id}
                  placeholder="Sélectionner une mission"
                  options={missions?.data.map((m) => ({ value: m.id, label: m.title })) || []}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Type de source" error={errors.source_type_id?.message} required>
                  <Select
                    {...register('source_type_id', { valueAsNumber: true })}
                    error={!!errors.source_type_id}
                    placeholder="Sélectionner une source"
                    options={sourceTypes.map((s) => ({ value: s.id, label: s.label }))}
                  />
                </FormField>

                <FormField label="Entité concernée" error={errors.entity_id?.message} required>
                  <Select
                    {...register('entity_id', { valueAsNumber: true })}
                    error={!!errors.entity_id}
                    placeholder="Sélectionner une entité"
                    options={entities.map((e) => ({ value: e.id, label: e.label }))}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Référence externe">
                  <Input {...register('reference_externe')} placeholder="Ex: BCE/2024/001" />
                </FormField>

                <FormField label="Confidentialité">
                  <Select
                    {...register('confidentiality')}
                    options={[
                      { value: 'public', label: 'Public' },
                      { value: 'internal', label: 'Interne' },
                      { value: 'confidential', label: 'Confidentiel' },
                      { value: 'secret', label: 'Secret' },
                    ]}
                  />
                </FormField>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_regulatory"
                  {...register('is_regulatory')}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_regulatory" className="text-sm font-medium text-banking-text">
                  Recommandation réglementaire
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Constat & Recommendation */}
        {currentStep === 2 && (
          <Card>
            <h2 className="text-sm font-semibold text-banking-text mb-4">Constat & Qualification</h2>
            <div className="space-y-4">
              <FormField
                label="Constat"
                error={errors.constat?.message}
                hint="Décrivez précisément le constat observé"
                required
              >
                <Textarea
                  {...register('constat')}
                  error={!!errors.constat}
                  rows={5}
                  placeholder="Décrivez le constat observé..."
                />
              </FormField>

              <FormField
                label="Recommandation"
                error={errors.recommendation_text?.message}
                required
              >
                <Textarea
                  {...register('recommendation_text')}
                  error={!!errors.recommendation_text}
                  rows={5}
                  placeholder="Décrivez la recommandation..."
                />
              </FormField>

              <FormField label="Détail supplémentaire">
                <Textarea
                  {...register('recommendation_detail')}
                  rows={3}
                  placeholder="Informations complémentaires..."
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* Step 3: Risk scoring */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <RiskQualification
              severity={severity}
              probability={probability}
              onSeverityChange={(v) => {
                setSeverity(v as SeverityLevel);
                setValue('severity', v as SeverityLevel);
              }}
              onProbabilityChange={(v) => {
                setProbability(v as ProbabilityLevel);
                setValue('probability', v as ProbabilityLevel);
              }}
              impacts={impacts}
              onImpactChange={handleImpactChange}
            />
          </div>
        )}

        {/* Step 4: Responsables */}
        {currentStep === 4 && (
          <Card>
            <h2 className="text-sm font-semibold text-banking-text mb-4">Responsables & Échéances</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Responsable (personne)">
                  <Select
                    {...register('responsible_user_id', { valueAsNumber: true })}
                    placeholder="Sélectionner un responsable"
                    options={users?.data.map((u) => ({ value: u.id, label: u.full_name })) || []}
                  />
                </FormField>
                <FormField label="Entité responsable">
                  <Select
                    {...register('responsible_entity_id', { valueAsNumber: true })}
                    placeholder="Sélectionner une entité"
                    options={entities.map((e) => ({ value: e.id, label: e.label }))}
                  />
                </FormField>
              </div>

              <FormField label="Validateur">
                <Select
                  {...register('validator_user_id', { valueAsNumber: true })}
                  placeholder="Sélectionner un validateur"
                  options={users?.data.map((u) => ({ value: u.id, label: u.full_name })) || []}
                />
              </FormField>

              <FormField
                label="Échéance initiale"
                error={errors.initial_deadline?.message}
                required
              >
                <DatePicker
                  {...register('initial_deadline')}
                  error={!!errors.initial_deadline}
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <Card>
            <h2 className="text-sm font-semibold text-banking-text mb-4">Révision & Confirmation</h2>
            <div className="space-y-3">
              <ReviewRow label="Mission" value={missions?.data.find((m) => m.id === Number(watch('mission_id')))?.title} />
              <ReviewRow label="Source" value={sourceTypes.find((s) => s.id === Number(watch('source_type_id')))?.label} />
              <ReviewRow label="Entité" value={entities.find((e) => e.id === Number(watch('entity_id')))?.label} />
              <ReviewRow label="Réglementaire" value={watch('is_regulatory') ? 'Oui' : 'Non'} />
              <ReviewRow label="Sévérité" value={`${severity}/5`} />
              <ReviewRow label="Probabilité" value={`${probability}/5`} />
              <ReviewRow label="Score" value={`${severity * probability}/25`} />
              <ReviewRow label="Échéance" value={watch('initial_deadline')} />
            </div>

            <div className="mt-4 pt-4 border-t border-banking-border">
              <p className="text-sm font-semibold text-banking-text mb-2">Constat :</p>
              <p className="text-sm text-banking-muted whitespace-pre-wrap">{watch('constat')}</p>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button
            variant="ghost"
            type="button"
            onClick={() => currentStep === 1 ? navigate(-1) : setCurrentStep((s) => s - 1)}
          >
            {currentStep === 1 ? 'Annuler' : '← Précédent'}
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext} rightIcon={<ArrowRight size={14} />}>
              Suivant
            </Button>
          ) : (
            <Button type="submit" isLoading={isPending} leftIcon={<Check size={14} />}>
              Créer la recommandation
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

const ReviewRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex items-center gap-4 py-1.5 border-b border-banking-border">
    <span className="w-40 flex-shrink-0 text-xs font-medium text-banking-muted">{label}</span>
    <span className="text-sm text-banking-text">{value || '-'}</span>
  </div>
);
