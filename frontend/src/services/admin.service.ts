import api from './api';
import {
  User,
  Role,
  Entity,
  SourceType,
  Parameter,
  WorkflowStep,
  ReminderRule,
  Permission,
  UserForm,
  EntityForm,
  SourceTypeForm,
  PaginatedResponse,
  PaginationParams,
  ApiResponse,
  AuditLog,
} from '../types';

export interface AuditLogFilters {
  user_id?: number;
  action?: string;
  module?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export const adminService = {
  // Users
  async getUsers(
    params?: PaginationParams & { search?: string; role_id?: number; is_active?: boolean }
  ): Promise<PaginatedResponse<User>> {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', {
      params,
    });
    return response.data.data;
  },

  async getUserById(id: number): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data.data;
  },

  async createUser(data: UserForm): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/admin/users', data);
    return response.data.data;
  },

  async updateUser(id: number, data: Partial<UserForm>): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data.data;
  },

  async toggleUserStatus(id: number): Promise<User> {
    const response = await api.post<ApiResponse<User>>(`/admin/users/${id}/toggle-status`);
    return response.data.data;
  },

  async resetUserPassword(id: number): Promise<{ temporary_password: string }> {
    const response = await api.post<ApiResponse<{ temporary_password: string }>>(
      `/admin/users/${id}/reset-password`
    );
    return response.data.data;
  },

  // Roles & Permissions
  async getRoles(): Promise<Role[]> {
    const response = await api.get<ApiResponse<Role[]>>('/admin/roles');
    return response.data.data;
  },

  async getRoleById(id: number): Promise<Role> {
    const response = await api.get<ApiResponse<Role>>(`/admin/roles/${id}`);
    return response.data.data;
  },

  async createRole(data: { code: string; label: string; description?: string; permission_ids: number[] }): Promise<Role> {
    const response = await api.post<ApiResponse<Role>>('/admin/roles', data);
    return response.data.data;
  },

  async updateRole(id: number, data: { label?: string; description?: string; permission_ids?: number[] }): Promise<Role> {
    const response = await api.put<ApiResponse<Role>>(`/admin/roles/${id}`, data);
    return response.data.data;
  },

  async deleteRole(id: number): Promise<void> {
    await api.delete(`/admin/roles/${id}`);
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await api.get<ApiResponse<Permission[]>>('/admin/permissions');
    return response.data.data;
  },

  // Entities
  async getEntities(params?: { search?: string; type?: string; parent_id?: number }): Promise<Entity[]> {
    const response = await api.get<ApiResponse<Entity[]>>('/admin/entities', { params });
    return response.data.data;
  },

  async createEntity(data: EntityForm): Promise<Entity> {
    const response = await api.post<ApiResponse<Entity>>('/admin/entities', data);
    return response.data.data;
  },

  async updateEntity(id: number, data: Partial<EntityForm>): Promise<Entity> {
    const response = await api.put<ApiResponse<Entity>>(`/admin/entities/${id}`, data);
    return response.data.data;
  },

  async deleteEntity(id: number): Promise<void> {
    await api.delete(`/admin/entities/${id}`);
  },

  // Source Types
  async getSourceTypes(params?: { search?: string; category?: string; is_active?: boolean }): Promise<SourceType[]> {
    const response = await api.get<ApiResponse<SourceType[]>>('/admin/source-types', {
      params,
    });
    return response.data.data;
  },

  async createSourceType(data: SourceTypeForm): Promise<SourceType> {
    const response = await api.post<ApiResponse<SourceType>>('/admin/source-types', data);
    return response.data.data;
  },

  async updateSourceType(id: number, data: Partial<SourceTypeForm>): Promise<SourceType> {
    const response = await api.put<ApiResponse<SourceType>>(`/admin/source-types/${id}`, data);
    return response.data.data;
  },

  async deleteSourceType(id: number): Promise<void> {
    await api.delete(`/admin/source-types/${id}`);
  },

  // Parameters
  async getParameters(category?: string): Promise<Parameter[]> {
    const response = await api.get<ApiResponse<Parameter[]>>('/admin/parameters', {
      params: { category },
    });
    return response.data.data;
  },

  async updateParameter(id: number, value: string): Promise<Parameter> {
    const response = await api.put<ApiResponse<Parameter>>(`/admin/parameters/${id}`, {
      value,
    });
    return response.data.data;
  },

  // Workflow
  async getWorkflowSteps(): Promise<WorkflowStep[]> {
    const response = await api.get<ApiResponse<WorkflowStep[]>>('/admin/workflow');
    return response.data.data;
  },

  async updateWorkflowStep(id: number, data: Partial<WorkflowStep>): Promise<WorkflowStep> {
    const response = await api.put<ApiResponse<WorkflowStep>>(
      `/admin/workflow/${id}`,
      data
    );
    return response.data.data;
  },

  // Reminder Rules
  async getReminderRules(): Promise<ReminderRule[]> {
    const response = await api.get<ApiResponse<ReminderRule[]>>('/admin/reminder-rules');
    return response.data.data;
  },

  async createReminderRule(data: Omit<ReminderRule, 'id' | 'created_at'>): Promise<ReminderRule> {
    const response = await api.post<ApiResponse<ReminderRule>>('/admin/reminder-rules', data);
    return response.data.data;
  },

  async updateReminderRule(
    id: number,
    data: Partial<ReminderRule>
  ): Promise<ReminderRule> {
    const response = await api.put<ApiResponse<ReminderRule>>(
      `/admin/reminder-rules/${id}`,
      data
    );
    return response.data.data;
  },

  async deleteReminderRule(id: number): Promise<void> {
    await api.delete(`/admin/reminder-rules/${id}`);
  },

  // Audit Logs
  async getAuditLogs(
    params?: PaginationParams & AuditLogFilters
  ): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>(
      '/admin/audit-logs',
      { params }
    );
    return response.data.data;
  },

  async exportAuditLogs(params?: AuditLogFilters): Promise<Blob> {
    const response = await api.get('/admin/audit-logs/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
