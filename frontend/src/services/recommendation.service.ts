import api from './api';
import {
  Recommendation,
  RecommendationForm,
  CommentForm,
  DeadlineExtensionForm,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
  ApiResponse,
  Comment,
  StatusHistory,
  DeadlineExtension,
} from '../types';

export const recommendationService = {
  async getAll(
    params?: PaginationParams & FilterParams
  ): Promise<PaginatedResponse<Recommendation>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Recommendation>>>(
      '/recommendations',
      { params }
    );
    return response.data.data;
  },

  async getById(id: number): Promise<Recommendation> {
    const response = await api.get<ApiResponse<Recommendation>>(`/recommendations/${id}`);
    return response.data.data;
  },

  async create(data: RecommendationForm): Promise<Recommendation> {
    const response = await api.post<ApiResponse<Recommendation>>('/recommendations', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<RecommendationForm>): Promise<Recommendation> {
    const response = await api.put<ApiResponse<Recommendation>>(`/recommendations/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/recommendations/${id}`);
  },

  async changeStatus(
    id: number,
    status: string,
    comment?: string
  ): Promise<Recommendation> {
    const response = await api.post<ApiResponse<Recommendation>>(
      `/recommendations/${id}/status`,
      { status, comment }
    );
    return response.data.data;
  },

  async updateProgress(id: number, progress: number): Promise<Recommendation> {
    const response = await api.patch<ApiResponse<Recommendation>>(
      `/recommendations/${id}/progress`,
      { progress_rate: progress }
    );
    return response.data.data;
  },

  async getComments(id: number): Promise<Comment[]> {
    const response = await api.get<ApiResponse<Comment[]>>(`/recommendations/${id}/comments`);
    return response.data.data;
  },

  async addComment(id: number, data: CommentForm): Promise<Comment> {
    const response = await api.post<ApiResponse<Comment>>(
      `/recommendations/${id}/comments`,
      data
    );
    return response.data.data;
  },

  async getStatusHistory(id: number): Promise<StatusHistory[]> {
    const response = await api.get<ApiResponse<StatusHistory[]>>(
      `/recommendations/${id}/history`
    );
    return response.data.data;
  },

  async requestExtension(id: number, data: DeadlineExtensionForm): Promise<DeadlineExtension> {
    const response = await api.post<ApiResponse<DeadlineExtension>>(
      `/recommendations/${id}/extensions`,
      data
    );
    return response.data.data;
  },

  async reviewExtension(
    id: number,
    extensionId: number,
    decision: 'approved' | 'rejected',
    comment?: string
  ): Promise<DeadlineExtension> {
    const response = await api.post<ApiResponse<DeadlineExtension>>(
      `/recommendations/${id}/extensions/${extensionId}/review`,
      { status: decision, comment }
    );
    return response.data.data;
  },

  async exportExcel(params?: FilterParams): Promise<Blob> {
    const response = await api.get('/recommendations/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async exportPdf(id: number): Promise<Blob> {
    const response = await api.get(`/recommendations/${id}/export/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
