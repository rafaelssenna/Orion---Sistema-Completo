export type UserRole = "admin" | "programador" | "marketing" | "administrativo" | "designer";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  status: "em_andamento" | "finalizado";
  created_by: number;
  created_at: string;
  task_stats?: TaskStats;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  creator: User;
}

export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

export interface TaskComment {
  id: number;
  content: string;
  task_id: number;
  user_id: number;
  user: { id: number; name: string };
  created_at: string;
  updated_at: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "pendente" | "em_andamento" | "concluida";
  priority: TaskPriority;
  due_date: string | null;
  project_id: number;
  assignee_id: number | null;
  created_at: string;
  completed_at: string | null;
  assignee?: User;
  project?: Project;
  comments?: TaskComment[];
}

export interface TaskStats {
  pending: number;
  in_progress: number;
  completed: number;
}

export interface AdminDashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  total_users: number;
  total_programmers: number;
  completion_rate: number;
}

export interface ProgrammerDashboardStats {
  assigned_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  projects_count: number;
  completion_rate: number;
}

export interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  user_name: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
