import api from './api';
import {
  Notification,
  PaginatedResponse,
  PaginationParams,
  ApiResponse,
  NotificationType,
} from '../types';

export const notificationService = {
  async getAll(
    params?: PaginationParams & { is_read?: boolean; type?: NotificationType }
  ): Promise<PaginatedResponse<Notification>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
      '/notifications',
      { params }
    );
    return response.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count'
    );
    return response.data.data.count;
  },

  async markAsRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark-all-read');
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
