"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { User, UserRole } from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [programmers, setProgrammers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (params?: { skip?: number; limit?: number; role?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params?.skip) queryParams.append("skip", params.skip.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.role) queryParams.append("role", params.role);

        const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const data = await api.get<{ users: User[]; total: number }>(
          `/users${query}`
        );
        setUsers(data.users);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar usuarios");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchProgrammers = useCallback(async () => {
    try {
      const data = await api.get<User[]>("/users/programmers");
      setProgrammers(data);
    } catch (err) {
      console.error("Erro ao carregar programadores:", err);
    }
  }, []);

  const getUser = async (id: number): Promise<User | null> => {
    try {
      return await api.get<User>(`/users/${id}`);
    } catch {
      return null;
    }
  };

  const createUser = async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> => {
    const user = await api.post<User>("/auth/register", data);
    await fetchUsers();
    return user;
  };

  const updateUser = async (id: number, data: Partial<User>): Promise<User> => {
    const user = await api.put<User>(`/users/${id}`, data);
    await fetchUsers();
    return user;
  };

  const deleteUser = async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
    await fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
    fetchProgrammers();
  }, [fetchUsers, fetchProgrammers]);

  return {
    users,
    programmers,
    total,
    loading,
    error,
    fetchUsers,
    fetchProgrammers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
}
