"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TasksChart } from "@/components/dashboard/TasksChart";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { api } from "@/lib/api";
import { AdminDashboardStats } from "@/types";
import {
  FolderKanban,
  ListTodo,
  Users,
  TrendingUp,
  Rocket,
  Target,
  Zap,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<AdminDashboardStats>("/dashboard/stats");
        setStats(data);
      } catch (error) {
        console.error("Erro ao carregar estatisticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orion-accent to-orion-accent-dark flex items-center justify-center animate-pulse shadow-glow-md">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <div className="w-8 h-8 border-2 border-orion-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-orion-star-silver/50 text-sm">Carregando dashboard...</p>
      </div>
    );
  }

  const completionRate = stats?.completion_rate || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orion-star-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orion-accent/15">
              <Rocket className="w-6 h-6 text-orion-accent" />
            </div>
            Dashboard
          </h1>
          <p className="text-orion-star-silver/70 mt-1">
            Visao geral do sistema Orion
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-orion-star-silver">Sistema Online</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Projetos Ativos"
          value={stats?.active_projects || 0}
          icon={<FolderKanban className="w-6 h-6" />}
          color="accent"
        />
        <StatsCard
          title="Total de Tarefas"
          value={stats?.total_tasks || 0}
          icon={<ListTodo className="w-6 h-6" />}
          color="nebula"
        />
        <StatsCard
          title="Programadores"
          value={stats?.total_programmers || 0}
          icon={<Users className="w-6 h-6" />}
          color="cyan"
        />
        <StatsCard
          title="Taxa de Conclusao"
          value={`${completionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Chart */}
        <div className="lg:col-span-1">
          <TasksChart
            pending={stats?.pending_tasks || 0}
            inProgress={stats?.in_progress_tasks || 0}
            completed={stats?.completed_tasks || 0}
          />
        </div>

        {/* Performance & Progress */}
        <div className="lg:col-span-1 space-y-6">
          {/* Completion Rate Card */}
          <div className="glass-card">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-orion-accent" />
                <h3 className="text-lg font-semibold text-orion-star-white">
                  Taxa de Conclusao
                </h3>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-5xl font-bold gradient-text">
                  {completionRate.toFixed(1)}%
                </span>
                <span className="text-orion-star-silver/50 pb-2">das tarefas</span>
              </div>
              <ProgressBar value={completionRate} color="success" size="lg" />
              <p className="text-xs text-orion-star-silver/50 mt-3">
                {stats?.completed_tasks || 0} de {stats?.total_tasks || 0} tarefas concluidas
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-orion-accent" />
                <h3 className="text-lg font-semibold text-orion-star-white">
                  Resumo Rapido
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/15">
                  <span className="text-orion-star-silver">Tarefas Pendentes</span>
                  <span className="text-xl font-bold text-amber-400">
                    {stats?.pending_tasks || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-orion-accent/10 border border-orion-accent/15">
                  <span className="text-orion-star-silver">Em Andamento</span>
                  <span className="text-xl font-bold text-orion-accent">
                    {stats?.in_progress_tasks || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                  <span className="text-orion-star-silver">Concluidas</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {stats?.completed_tasks || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>

      {/* Bottom decorative element */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-orion-star-silver/30">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-orion-accent/30" />
          <Rocket className="w-4 h-4" />
          <span className="text-xs">Sistema Orion v1.0</span>
          <Rocket className="w-4 h-4" />
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-orion-accent/30" />
        </div>
      </div>
    </div>
  );
}
