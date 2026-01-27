"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Project, ProjectDetail } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(
    async (params?: { skip?: number; limit?: number; status?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params?.skip) queryParams.append("skip", params.skip.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.status) queryParams.append("status", params.status);

        const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const data = await api.get<{ projects: Project[]; total: number }>(
          `/projects${query}`
        );
        setProjects(data.projects);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar projetos");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getProject = async (id: number): Promise<ProjectDetail | null> => {
    try {
      return await api.get<ProjectDetail>(`/projects/${id}`);
    } catch {
      return null;
    }
  };

  const createProject = async (data: {
    name: string;
    description?: string;
    internal_prompt?: string;
    main_features?: string[];
  }): Promise<Project> => {
    const project = await api.post<Project>("/projects", data);
    await fetchProjects();
    return project;
  };

  const updateProject = async (
    id: number,
    data: Partial<Project>
  ): Promise<Project> => {
    const project = await api.put<Project>(`/projects/${id}`, data);
    await fetchProjects();
    return project;
  };

  const deleteProject = async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
    await fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    total,
    loading,
    error,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
  };
}
