import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Shield, Bell, Key, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { changePasswordSchema } from '../utils/validators';
import { ChangePasswordForm } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { formatDateTime } from '../utils/formatters';
import { initials } from '../utils/formatters';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const { mutate: changePassword } = useMutation({
    mutationFn: (data: ChangePasswordForm) => authService.changePassword(data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
      reset();
    },
    onError: () => toast.error('Erreur lors du changement de mot de passe'),
  });

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <User size={14} /> },
    { id: 'security', label: 'Sécurité', icon: <Key size={14} /> },
    { id: 'notifications', label: 'Préférences', icon: <Bell size={14} /> },
  ];

  if (!user) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Profile header */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">
            {initials(user.first_name, user.last_name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-banking-text">{user.full_name}</h1>
            <p className="text-sm text-banking-muted">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">{user.role?.label}</span>
              {user.entity && (
                <>
                  <span className="text-banking-muted">•</span>
                  <span className="text-xs text-banking-muted">{user.entity.label}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Prénom" value={user.first_name} />
            <InfoRow label="Nom" value={user.last_name} />
            <InfoRow label="Identifiant" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Téléphone" value={user.phone} />
            <InfoRow label="Rôle" value={user.role?.label} />
            <InfoRow label="Entité" value={user.entity?.label} />
            <InfoRow label="Dernière connexion" value={formatDateTime(user.last_login)} />
            <InfoRow label="Compte créé" value={formatDateTime(user.created_at)} />
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Changer le mot de passe</h2>
          <form onSubmit={handleSubmit((d) => changePassword(d))} className="space-y-4">
            <FormField label="Mot de passe actuel" error={errors.current_password?.message} required>
              <Input
                type="password"
                {...register('current_password')}
                error={!!errors.current_password}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </FormField>
            <FormField label="Nouveau mot de passe" error={errors.new_password?.message} required hint="Minimum 8 caractères">
              <Input
                type="password"
                {...register('new_password')}
                error={!!errors.new_password}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirmer le mot de passe" error={errors.confirm_password?.message} required>
              <Input
                type="password"
                {...register('confirm_password')}
                error={!!errors.confirm_password}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={14} />}>
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <h2 className="text-sm font-semibold text-banking-text mb-4">Préférences de notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-banking-text">Notifications email</p>
                <p className="text-xs text-banking-muted">Recevoir des notifications par email</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={user.preferences?.notifications_email}
                className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-banking-text">Rappels d'échéance</p>
                <p className="text-xs text-banking-muted">Rappels avant les échéances</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-banking-text">Changements de statut</p>
                <p className="text-xs text-banking-muted">Notifications lors des changements de statut</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
              />
            </label>
            <div className="flex justify-end">
              <Button leftIcon={<Save size={14} />} onClick={() => toast.success('Préférences sauvegardées')}>
                Enregistrer
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-banking-muted mb-0.5">{label}</p>
    <p className="text-sm text-banking-text">{value || '-'}</p>
  </div>
);
