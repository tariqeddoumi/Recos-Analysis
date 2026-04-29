import api from './api';
import {
  Mission,
  MissionForm,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
  ApiResponse,
} from '../types';

export type MissionFilters = FilterParams & {
  type?: string;
};

export const missionService = {
  async getAll(
    params?: PaginationParams & MissionFilters
  ): Promise<PaginatedResponse<Mission>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Mission>>>('/missions', {
      params,
    });
    return response.data.data;
  },

  async getById(id: number): Promise<Mission> {
    const response = await api.get<ApiResponse<Mission>>(`/missions/${id}`);
    return response.data.data;
  },

  async create(data: MissionForm): Promise<Mission> {
    const response = await api.post<ApiResponse<Mission>>('/missions', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<MissionForm>): Promise<Mission> {
    const response = await api.put<ApiResponse<Mission>>(`/missions/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/missions/${id}`);
  },

  async changeStatus(id: number, status: string, comment?: string): Promise<Mission> {
    const response = await api.post<ApiResponse<Mission>>(`/missions/${id}/status`, {
      status,
      comment,
    });
    return response.data.data;
  },

  async uploadAttachment(id: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/missions/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async deleteAttachment(missionId: number, attachmentId: number): Promise<void> {
    await api.delete(`/missions/${missionId}/attachments/${attachmentId}`);
  },

  async exportExcel(params?: MissionFilters): Promise<Blob> {
    const response = await api.get('/missions/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
