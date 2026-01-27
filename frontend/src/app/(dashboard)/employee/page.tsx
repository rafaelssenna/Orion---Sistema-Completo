"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TasksChart } from "@/components/dashboard/TasksChart";
import { api } from "@/lib/api";
import { useTasks } from "@/hooks/useTasks";
import { ProgrammerDashboardStats } from "@/types";
import {
  ListTodo,
  Clock,
  CheckCircle,
  FolderKanban,
  Code2,
  Flame,
  Trophy,
  Rocket,
} from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProgrammerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { tasks, fetchMyTasks, updateTaskStatus } = useTasks();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await api.get<ProgrammerDashboardStats>("/dashboard/my-stats");
        setStats(statsData);
        await fetchMyTasks();
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTaskStatus(taskId, status as any);
      const statsData = await api.get<ProgrammerDashboardStats>("/dashboard/my-stats");
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-xl bg-orion-accent flex items-center justify-center">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-orion-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-orion-star-silver/50 text-sm">Carregando seu painel...</p>
      </div>
    );
  }

  const activeTasks = tasks.filter(
    (t) => t.status === "pendente" || t.status === "em_andamento"
  );

  const totalTasks = stats?.assigned_tasks || 0;
  const completedTasks = stats?.completed_tasks || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orion-star-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orion-accent/15">
              <Code2 className="w-6 h-6 text-orion-accent" />
            </div>
            Ola, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-orion-star-silver/70 mt-1">
            Aqui esta o resumo das suas atividades
          </p>
        </div>
        {activeTasks.length > 0 && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-orion-accent/10 border border-orion-accent/20">
            <Flame className="w-4 h-4 text-orion-accent" />
            <span className="text-sm text-orion-accent">{activeTasks.length} tarefas ativas</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Minhas Tarefas"
          value={stats?.assigned_tasks || 0}
          icon={<ListTodo className="w-6 h-6" />}
          color="accent"
        />
        <StatsCard
          title="Pendentes"
          value={stats?.pending_tasks || 0}
          icon={<Clock className="w-6 h-6" />}
          color="warning"
        />
        <StatsCard
          title="Concluidas"
          value={stats?.completed_tasks || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="success"
        />
        <StatsCard
          title="Projetos"
          value={stats?.projects_count || 0}
          icon={<FolderKanban className="w-6 h-6" />}
          color="cyan"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="glass-card">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-orion-accent" />
              <h3 className="text-lg font-semibold text-orion-star-white">Seu Progresso</h3>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-orion-star-white">
                    {completionRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-orion-star-silver/50">concluido</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-orion-star-silver">Tarefas concluidas</span>
                <span className="font-semibold text-emerald-400">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-orion-star-silver">Total de tarefas</span>
                <span className="font-semibold text-orion-star-white">{totalTasks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Chart */}
        <div className="lg:col-span-2">
          <TasksChart
            pending={stats?.pending_tasks || 0}
            inProgress={(stats?.assigned_tasks || 0) - (stats?.pending_tasks || 0) - (stats?.completed_tasks || 0)}
            completed={stats?.completed_tasks || 0}
          />
        </div>
      </div>

      {/* Active Tasks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orion-accent" />
          <h2 className="text-xl font-semibold text-orion-star-white">Tarefas Ativas</h2>
        </div>

        {activeTasks.length === 0 ? (
          <div className="glass-card">
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-orion-star-white mb-2">
                Tudo em dia!
              </h3>
              <p className="text-orion-star-silver/70">
                Nenhuma tarefa pendente no momento. Aproveite para relaxar ou verificar novos projetos.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                canChangeStatus={true}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
