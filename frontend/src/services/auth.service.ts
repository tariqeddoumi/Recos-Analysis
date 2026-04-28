import api from './api';
import { User, LoginForm, ChangePasswordForm, ApiResponse } from '../types';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const authService = {
  async login(credentials: LoginForm): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const data = response.data.data;
    authService.setToken(data.access_token);
    authService.setRefreshToken(data.refresh_token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      authService.removeToken();
    }
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  async changePassword(data: ChangePasswordForm): Promise<void> {
    await api.post('/auth/change-password', data);
  },

  async refreshToken(): Promise<string> {
    const refresh = authService.getRefreshToken();
    const response = await api.post<ApiResponse<{ access_token: string }>>('/auth/refresh', {
      refresh_token: refresh,
    });
    const newToken = response.data.data.access_token;
    authService.setToken(newToken);
    return newToken;
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_KEY, token);
  },

  isAuthenticated(): boolean {
    return !!authService.getToken();
  },
};
