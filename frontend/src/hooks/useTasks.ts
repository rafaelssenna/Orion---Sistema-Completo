"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Task, TaskComment, TaskPriority } from "@/types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(
    async (params?: {
      skip?: number;
      limit?: number;
      status?: string;
      project_id?: number;
      assignee_id?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params?.skip) queryParams.append("skip", params.skip.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.status) queryParams.append("status", params.status);
        if (params?.project_id)
          queryParams.append("project_id", params.project_id.toString());
        if (params?.assignee_id)
          queryParams.append("assignee_id", params.assignee_id.toString());

        const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const data = await api.get<{ tasks: Task[]; total: number }>(
          `/tasks${query}`
        );
        setTasks(data.tasks);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar tarefas");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchMyTasks = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${status}` : "";
      const data = await api.get<Task[]>(`/tasks/my${query}`);
      setTasks(data);
      setTotal(data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, []);

  const getTask = async (id: number): Promise<Task | null> => {
    try {
      return await api.get<Task>(`/tasks/${id}`);
    } catch {
      return null;
    }
  };

  const createTask = async (data: {
    title: string;
    description?: string;
    project_id: number;
    assignee_id?: number;
    priority?: TaskPriority;
    due_date?: string;
  }): Promise<Task> => {
    const task = await api.post<Task>("/tasks", data);
    await fetchTasks();
    return task;
  };

  const updateTask = async (id: number, data: Partial<Task>): Promise<Task> => {
    const task = await api.put<Task>(`/tasks/${id}`, data);
    await fetchTasks();
    return task;
  };

  const updateTaskStatus = async (
    id: number,
    status: "pendente" | "em_andamento" | "concluida"
  ): Promise<Task> => {
    const task = await api.patch<Task>(`/tasks/${id}/status`, { status });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    return task;
  };

  const deleteTask = async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
    await fetchTasks();
  };

  // Comment methods
  const getComments = async (taskId: number): Promise<TaskComment[]> => {
    const data = await api.get<{ comments: TaskComment[]; total: number }>(
      `/tasks/${taskId}/comments`
    );
    return data.comments;
  };

  const addComment = async (taskId: number, content: string): Promise<TaskComment> => {
    return await api.post<TaskComment>(`/tasks/${taskId}/comments`, { content });
  };

  const editComment = async (commentId: number, content: string): Promise<TaskComment> => {
    return await api.put<TaskComment>(`/tasks/comments/${commentId}`, { content });
  };

  const deleteComment = async (commentId: number): Promise<void> => {
    await api.delete(`/tasks/comments/${commentId}`);
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    total,
    loading,
    error,
    fetchTasks,
    fetchMyTasks,
    getTask,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getComments,
    addComment,
    editComment,
    deleteComment,
  };
}
