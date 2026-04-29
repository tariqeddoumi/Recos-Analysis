import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { DatePicker } from '../ui/DatePicker';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { deadlineExtensionSchema } from '../../utils/validators';
import { DeadlineExtensionForm as FormType } from '../../types';
import { recommendationService } from '../../services/recommendation.service';
import { formatDate } from '../../utils/formatters';

interface DeadlineExtensionFormProps {
  isOpen: boolean;
  onClose: () => void;
  recommendationId: number;
  currentDeadline: string;
}

export const DeadlineExtensionFormModal: React.FC<DeadlineExtensionFormProps> = ({
  isOpen,
  onClose,
  recommendationId,
  currentDeadline,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormType>({
    resolver: zodResolver(deadlineExtensionSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormType) =>
      recommendationService.requestExtension(recommendationId, data),
    onSuccess: () => {
      toast.success("Demande de prolongation soumise avec succès");
      queryClient.invalidateQueries({ queryKey: ['recommendation', recommendationId] });
      reset();
      onClose();
    },
    onError: () => {
      toast.error("Erreur lors de la soumission de la demande");
    },
  });

  const onSubmit = (data: FormType) => mutate(data);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demande de prolongation d'échéance"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <strong>Échéance actuelle :</strong> {formatDate(currentDeadline)}
          </p>
        </div>

        <FormField
          label="Nouvelle date d'échéance"
          error={errors.new_deadline?.message}
          required
        >
          <DatePicker
            {...register('new_deadline')}
            error={!!errors.new_deadline}
            min={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField
          label="Justification"
          error={errors.reason?.message}
          hint="Minimum 10 caractères"
          required
        >
          <Textarea
            {...register('reason')}
            error={!!errors.reason}
            rows={4}
            placeholder="Expliquez les raisons de cette demande de prolongation..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button" disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isPending}>
            Soumettre la demande
          </Button>
        </div>
      </form>
    </Modal>
  );
};
