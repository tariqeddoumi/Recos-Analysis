import api from './api';
import {
  Evidence,
  EvidenceStatus,
  PaginatedResponse,
  PaginationParams,
  ApiResponse,
} from '../types';

export interface EvidenceFilters {
  recommendation_id?: number;
  action_plan_id?: number;
  status?: EvidenceStatus;
  search?: string;
}

export const evidenceService = {
  async getAll(
    params?: PaginationParams & EvidenceFilters
  ): Promise<PaginatedResponse<Evidence>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Evidence>>>('/evidences', {
      params,
    });
    return response.data.data;
  },

  async getById(id: number): Promise<Evidence> {
    const response = await api.get<ApiResponse<Evidence>>(`/evidences/${id}`);
    return response.data.data;
  },

  async upload(
    file: File,
    data: {
      title: string;
      description?: string;
      recommendation_id?: number;
      action_plan_id?: number;
    }
  ): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.recommendation_id)
      formData.append('recommendation_id', String(data.recommendation_id));
    if (data.action_plan_id)
      formData.append('action_plan_id', String(data.action_plan_id));

    const response = await api.post<ApiResponse<Evidence>>('/evidences', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async review(
    id: number,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<Evidence> {
    const response = await api.post<ApiResponse<Evidence>>(`/evidences/${id}/review`, {
      status,
      comment,
    });
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/evidences/${id}`);
  },

  async download(id: number): Promise<Blob> {
    const response = await api.get(`/evidences/${id}/download`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  getDownloadUrl(id: number): string {
    return `/api/evidences/${id}/download`;
  },
};
