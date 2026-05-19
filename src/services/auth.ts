import api from './api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      email: data.email,
      username: data.username,
      password: data.password,
      displayName: data.name,
    });
    return response.data.data;
  },
};
