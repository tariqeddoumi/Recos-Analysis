import api from './api';
import {
  DashboardData,
  DashboardKpis,
  DashboardMyTasks,
  ChartDataBySource,
  ChartDataByStatus,
  TrendDataPoint,
  Recommendation,
  ApiResponse,
} from '../types';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get<ApiResponse<DashboardData>>('/dashboard');
    return response.data.data;
  },

  async getKpis(): Promise<DashboardKpis> {
    const response = await api.get<ApiResponse<DashboardKpis>>('/dashboard/kpis');
    return response.data.data;
  },

  async getMyTasks(): Promise<DashboardMyTasks> {
    const response = await api.get<ApiResponse<DashboardMyTasks>>('/dashboard/my-tasks');
    return response.data.data;
  },

  async getBySource(): Promise<ChartDataBySource[]> {
    const response = await api.get<ApiResponse<ChartDataBySource[]>>(
      '/dashboard/by-source'
    );
    return response.data.data;
  },

  async getByStatus(): Promise<ChartDataByStatus[]> {
    const response = await api.get<ApiResponse<ChartDataByStatus[]>>(
      '/dashboard/by-status'
    );
    return response.data.data;
  },

  async getTrend(months?: number): Promise<TrendDataPoint[]> {
    const response = await api.get<ApiResponse<TrendDataPoint[]>>('/dashboard/trend', {
      params: { months },
    });
    return response.data.data;
  },

  async getCriticalRecommendations(): Promise<Recommendation[]> {
    const response = await api.get<ApiResponse<Recommendation[]>>(
      '/dashboard/critical-recommendations'
    );
    return response.data.data;
  },

  async getRegulatoryAlerts(): Promise<Recommendation[]> {
    const response = await api.get<ApiResponse<Recommendation[]>>(
      '/dashboard/regulatory-alerts'
    );
    return response.data.data;
  },
};
