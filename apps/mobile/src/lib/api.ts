import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await SecureStore.setItemAsync('orion_token', token);
    } else {
      await SecureStore.deleteItemAsync('orion_token');
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = await SecureStore.getItemAsync('orion_token');
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro de rede' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.request<any>('/auth/me');
  }

  // Projects
  getProjects() {
    return this.request<any[]>('/projects');
  }

  getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  // Tasks
  getTasks(params?: { projectId?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/tasks${query ? `?${query}` : ''}`);
  }

  updateTask(id: string, data: any) {
    return this.request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  createTask(data: any) {
    return this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  }

  // Activities
  getActivities(params?: { projectId?: string; userId?: string; limit?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/activities${query ? `?${query}` : ''}`);
  }

  createActivity(data: any) {
    return this.request<any>('/activities', { method: 'POST', body: JSON.stringify(data) });
  }

  // Dashboard
  getDashboardOverview() {
    return this.request<any>('/dashboard/overview');
  }

  getDashboardPersonal() {
    return this.request<any>('/dashboard/personal');
  }

  // Notifications
  getNotifications() {
    return this.request<any[]>('/notifications');
  }

  getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }
}

export const api = new ApiClient();
