import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { User, UserForm as UserFormType } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { FilterBar, FilterConfig } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDateTime } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema } from '../../utils/validators';
import clsx from 'clsx';

const filterConfigs: FilterConfig[] = [
  {
    key: 'is_active',
    label: 'Statut',
    type: 'select',
    options: [
      { value: 'true', label: 'Actif' },
      { value: 'false', label: 'Inactif' },
    ],
  },
];

export const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, filters],
    queryFn: () => adminService.getUsers({ page, limit: 25, search: search || undefined, ...filters }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminService.getRoles(),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => adminService.getEntities(),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (id: number) => adminService.toggleUserStatus(id),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erreur'),
  });

  const { mutate: resetPassword, isPending: resetting } = useMutation({
    mutationFn: (id: number) => adminService.resetUserPassword(id),
    onSuccess: (data) => {
      toast.success(`Mot de passe temporaire: ${data.temporary_password}`, { duration: 10000 });
      setShowResetConfirm(null);
    },
    onError: () => toast.error('Erreur lors de la réinitialisation'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset: resetForm,
    setValue,
  } = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
  });

  const { mutate: saveUser } = useMutation({
    mutationFn: (data: UserFormType) =>
      editingUser
        ? adminService.updateUser(editingUser.id, data)
        : adminService.createUser(data),
    onSuccess: () => {
      toast.success(editingUser ? 'Utilisateur mis à jour' : 'Utilisateur créé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditingUser(null);
      resetForm();
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const openEdit = (user: User) => {
    setEditingUser(user);
    resetForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role.id,
      entity_id: user.entity_id,
      phone: user.phone,
      is_active: user.is_active,
    });
    setShowForm(true);
  };

  const columns: Column<User>[] = [
    {
      key: 'full_name',
      label: 'Nom complet',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
            {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-banking-text">{row.full_name}</p>
            <p className="text-xs text-banking-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'username', label: 'Identifiant', render: (r) => <span className="text-sm font-mono">{r.username}</span> },
    { key: 'role', label: 'Rôle', render: (r) => <span className="text-sm">{r.role?.label}</span> },
    { key: 'entity', label: 'Entité', render: (r) => <span className="text-sm">{r.entity?.label || '-'}</span> },
    {
      key: 'is_active',
      label: 'Statut',
      render: (r) => (
        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        )}>
          {r.is_active ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    { key: 'last_login', label: 'Dernière connexion', render: (r) => <span className="text-sm">{formatDateTime(r.last_login)}</span> },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleStatus(r.id); }} className={clsx('p-1.5 rounded transition-colors', r.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50')}>
            {r.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowResetConfirm(r); }} className="p-1.5 rounded text-gray-400 hover:text-warning hover:bg-amber-50 transition-colors">
            <Key size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Gestion des utilisateurs</h1>
          <p className="text-sm text-banking-muted">{data?.total ?? 0} utilisateur{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingUser(null); resetForm({ is_active: true }); setShowForm(true); }}>
          Nouvel utilisateur
        </Button>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={(k, v) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1); }}
        onReset={() => { setFilters({}); setSearch(''); setPage(1); }}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Rechercher un utilisateur..."
      />

      <DataTable<User>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={25}
        onPageChange={setPage}
        emptyMessage="Aucun utilisateur trouvé"
      />

      {/* Form modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingUser(null); }} title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} size="lg">
        <form onSubmit={handleSubmit((data) => saveUser(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prénom" error={errors.first_name?.message} required>
              <Input {...register('first_name')} error={!!errors.first_name} />
            </FormField>
            <FormField label="Nom" error={errors.last_name?.message} required>
              <Input {...register('last_name')} error={!!errors.last_name} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Identifiant" error={errors.username?.message} required>
              <Input {...register('username')} error={!!errors.username} />
            </FormField>
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" {...register('email')} error={!!errors.email} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rôle" error={errors.role_id?.message} required>
              <Select
                {...register('role_id', { valueAsNumber: true })}
                error={!!errors.role_id}
                placeholder="Sélectionner"
                options={roles.map((r) => ({ value: r.id, label: r.label }))}
              />
            </FormField>
            <FormField label="Entité">
              <Select
                {...register('entity_id', { valueAsNumber: true })}
                placeholder="Sélectionner"
                options={entities.map((e) => ({ value: e.id, label: e.label }))}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <Input type="tel" {...register('phone')} />
            </FormField>
            {!editingUser && (
              <FormField label="Mot de passe" error={errors.password?.message}>
                <Input type="password" {...register('password')} />
              </FormField>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('is_active')} className="rounded border-gray-300 text-primary" />
            <span className="text-sm text-banking-text">Compte actif</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingUser ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!showResetConfirm}
        onClose={() => setShowResetConfirm(null)}
        onConfirm={() => showResetConfirm && resetPassword(showResetConfirm.id)}
        title="Réinitialiser le mot de passe"
        message={`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${showResetConfirm?.full_name} ?`}
        confirmLabel="Réinitialiser"
        variant="warning"
        isLoading={resetting}
      />
    </div>
  );
};
