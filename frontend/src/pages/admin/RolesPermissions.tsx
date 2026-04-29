import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { Role, Permission } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';

export const RolesPermissions: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminService.getRoles(),
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => adminService.getPermissions(),
  });

  const { mutate: saveRole, isPending: saving } = useMutation({
    mutationFn: (data: { code: string; label: string; description?: string; permission_ids: number[] }) =>
      editingRole
        ? adminService.updateRole(editingRole.id, { label: data.label, description: data.description, permission_ids: data.permission_ids })
        : adminService.createRole(data),
    onSuccess: () => {
      toast.success(editingRole ? 'Rôle mis à jour' : 'Rôle créé');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowForm(false);
      setEditingRole(null);
    },
    onError: () => toast.error('Erreur'),
  });

  const { mutate: deleteRole, isPending: deleting } = useMutation({
    mutationFn: (id: number) => adminService.deleteRole(id),
    onSuccess: () => {
      toast.success('Rôle supprimé');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
    },
    onError: () => toast.error('Erreur'),
  });

  const openCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleCode('');
    setRoleDesc('');
    setSelectedPermissions(new Set());
    setShowForm(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.label);
    setRoleCode(role.code);
    setRoleDesc(role.description || '');
    setSelectedPermissions(new Set(role.permissions.map((p) => p.id)));
    setShowForm(true);
  };

  const togglePermission = (id: number) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  if (loadingRoles || loadingPermissions) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Rôles & Permissions</h1>
          <p className="text-sm text-banking-muted">{roles.length} rôle{roles.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nouveau rôle</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roles list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-banking-text">Rôles</h2>
          {roles.map((role) => (
            <Card
              key={role.id}
              padding="sm"
              hover
              onClick={() => setSelectedRole(role)}
              className={clsx('cursor-pointer', selectedRole?.id === role.id && 'border-secondary ring-2 ring-blue-100')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-banking-text">{role.label}</p>
                  <p className="text-xs font-mono text-banking-muted">{role.code}</p>
                  <p className="text-xs text-banking-muted mt-0.5">{role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(role); }} className="p-1.5 rounded text-gray-400 hover:text-secondary hover:bg-blue-50">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeletingRole(role); }} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Permissions matrix */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <Card>
              <h2 className="text-sm font-semibold text-banking-text mb-4">
                Permissions de: <span className="text-secondary">{selectedRole.label}</span>
              </h2>
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-xs font-semibold text-banking-muted uppercase mb-2">{module}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const hasIt = selectedRole.permissions.some((p) => p.id === perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                              hasIt ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                            )}
                          >
                            {hasIt ? <Check size={12} className="text-green-500 flex-shrink-0" /> : <div className="w-3 h-3 flex-shrink-0" />}
                            {perm.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-banking-muted text-center py-8">
                Sélectionnez un rôle pour voir ses permissions
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Form modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingRole ? 'Modifier le rôle' : 'Nouveau rôle'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" required>
              <Input value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="EX: ADMIN" disabled={!!editingRole} />
            </FormField>
            <FormField label="Libellé" required>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Administrateur" />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} rows={2} />
          </FormField>
          <div>
            <p className="text-sm font-medium text-banking-text mb-3">Permissions</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-xs font-semibold text-banking-muted uppercase mb-2">{module}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs',
                          selectedPermissions.has(perm.id)
                            ? 'bg-primary-50 border-primary text-primary'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button
              isLoading={saving}
              onClick={() => saveRole({ code: roleCode, label: roleName, description: roleDesc, permission_ids: [...selectedPermissions] })}
              disabled={!roleName || !roleCode}
            >
              {editingRole ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingRole}
        onClose={() => setDeletingRole(null)}
        onConfirm={() => deletingRole && deleteRole(deletingRole.id)}
        title="Supprimer le rôle"
        message={`Supprimer le rôle "${deletingRole?.label}" ? Les utilisateurs avec ce rôle seront affectés.`}
        isLoading={deleting}
      />
    </div>
  );
};
