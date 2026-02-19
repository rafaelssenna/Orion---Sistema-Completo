const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('orion_token', token);
    } else {
      localStorage.removeItem('orion_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('orion_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
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

  register(name: string, email: string, password: string, role?: string) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  getMe() {
    return this.request<any>('/auth/me');
  }

  // Users
  getUsers() {
    return this.request<any[]>('/users');
  }

  // Projects
  getProjects() {
    return this.request<any[]>('/projects');
  }

  getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  createProject(data: any) {
    return this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  }

  updateProject(id: string, data: any) {
    return this.request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteProject(id: string) {
    return this.request<any>(`/projects/${id}`, { method: 'DELETE' });
  }

  addProjectMember(projectId: string, userId: string, role?: string) {
    return this.request<any>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  }

  removeProjectMember(projectId: string, userId: string) {
    return this.request<any>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
  }

  // Tasks
  getTasks(params?: { projectId?: string; status?: string; assigneeId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/tasks${query ? `?${query}` : ''}`);
  }

  createTask(data: any) {
    return this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  }

  updateTask(id: string, data: any) {
    return this.request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  reorderTasks(tasks: { id: string; status: string; order: number }[]) {
    return this.request<any>('/tasks/reorder/batch', { method: 'PUT', body: JSON.stringify({ tasks }) });
  }

  // Activities
  getActivities(params?: { projectId?: string; userId?: string; limit?: string }) {
    const query = new URLSearchParams(params as any).toString();
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

  getHoursComparison(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<any[]>(`/dashboard/hours-comparison?${params}`);
  }

  getDevProductivity() {
    return this.request<any[]>('/dashboard/dev-productivity');
  }

  // GitHub
  connectRepo(projectId: string, repoFullName: string) {
    return this.request<any>('/github/connect-repo', {
      method: 'POST',
      body: JSON.stringify({ projectId, repoFullName }),
    });
  }

  syncRepo(repoId: string, full = false) {
    return this.request<any>(`/github/sync/${repoId}${full ? '?full=true' : ''}`, { method: 'POST' });
  }

  resyncAll() {
    return this.request<{ message: string; totalNew: number; repos: number; failed: number }>('/github/resync-all', { method: 'POST' });
  }

  fixCommitAuthors() {
    return this.request<{ message: string; updated: number }>('/github/fix-authors', { method: 'POST' });
  }

  getCommits(projectId: string) {
    return this.request<any[]>(`/github/commits/${projectId}`);
  }

  getRepos(projectId: string) {
    return this.request<any[]>(`/github/repos/${projectId}`);
  }

  // Notifications
  getNotifications() {
    return this.request<any[]>('/notifications');
  }

  getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  markAsRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT' });
  }

  // Organizations
  getMyOrganization() {
    return this.request<any>('/organizations/mine');
  }

  createOrganization(name: string, slug: string) {
    return this.request<any>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
  }

  updateOrganization(data: { name?: string; logoUrl?: string }) {
    return this.request<any>('/organizations/mine', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  addOrgMember(name: string, email: string, password: string, role: string) {
    return this.request<any>('/organizations/members', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  removeOrgMember(userId: string) {
    return this.request<any>(`/organizations/members/${userId}`, { method: 'DELETE' });
  }

  saveGithubToken(githubToken: string) {
    return this.request<{ message: string }>('/organizations/github-token', {
      method: 'PUT',
      body: JSON.stringify({ githubToken }),
    });
  }

  getProjectAiSummary(projectId: string) {
    return this.request<{ summary: string; stats: { commits: number; activities: number; tasksTotal: number; tasksDone: number; tasksInProgress: number } }>(`/projects/${projectId}/ai-summary`);
  }

  getAvailableRepos() {
    return this.request<Array<{
      fullName: string;
      name: string;
      description: string | null;
      private: boolean;
      updatedAt: string;
      defaultBranch: string;
      language: string | null;
      connectedProjectId: string | null;
    }>>('/github/available-repos');
  }
}

export const api = new ApiClient();
