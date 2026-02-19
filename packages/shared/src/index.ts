// Shared types between web, mobile, and API

export type Role = 'HEAD' | 'ADMIN' | 'DEV';

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type ActivityType = 'UPDATE' | 'NOTE' | 'BLOCKER' | 'DELIVERY' | 'AI_SUMMARY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientName?: string;
  status: ProjectStatus;
  priority: Priority;
  startDate?: string;
  deadline?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  estimatedHours?: number;
  order: number;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  projectId: string;
  taskId?: string;
  description: string;
  type: ActivityType;
  hoursSpent?: number;
  date: string;
  createdAt: string;
}

export interface GitCommit {
  id: string;
  repoId: string;
  projectId: string;
  sha: string;
  message: string;
  aiSummary?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  committedAt: string;
}
