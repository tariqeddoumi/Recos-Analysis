import api from './api';
import {
  ActionPlan,
  ActionPlanForm,
  CommentForm,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
  ApiResponse,
  Comment,
} from '../types';

export const actionPlanService = {
  async getAll(
    params?: PaginationParams & FilterParams & { recommendation_id?: number; action_status?: string }
  ): Promise<PaginatedResponse<ActionPlan>> {
    const response = await api.get<ApiResponse<PaginatedResponse<ActionPlan>>>('/action-plans', {
      params,
    });
    return response.data.data;
  },

  async getById(id: number): Promise<ActionPlan> {
    const response = await api.get<ApiResponse<ActionPlan>>(`/action-plans/${id}`);
    return response.data.data;
  },

  async create(data: ActionPlanForm): Promise<ActionPlan> {
    const response = await api.post<ApiResponse<ActionPlan>>('/action-plans', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<ActionPlanForm>): Promise<ActionPlan> {
    const response = await api.put<ApiResponse<ActionPlan>>(`/action-plans/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/action-plans/${id}`);
  },

  async changeStatus(id: number, status: string, comment?: string): Promise<ActionPlan> {
    const response = await api.post<ApiResponse<ActionPlan>>(`/action-plans/${id}/status`, {
      status,
      comment,
    });
    return response.data.data;
  },

  async updateProgress(id: number, progress: number): Promise<ActionPlan> {
    const response = await api.patch<ApiResponse<ActionPlan>>(
      `/action-plans/${id}/progress`,
      { progress_rate: progress }
    );
    return response.data.data;
  },

  async getComments(id: number): Promise<Comment[]> {
    const response = await api.get<ApiResponse<Comment[]>>(`/action-plans/${id}/comments`);
    return response.data.data;
  },

  async addComment(id: number, data: CommentForm): Promise<Comment> {
    const response = await api.post<ApiResponse<Comment>>(
      `/action-plans/${id}/comments`,
      data
    );
    return response.data.data;
  },

  async exportExcel(params?: FilterParams): Promise<Blob> {
    const response = await api.get('/action-plans/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
