'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, FolderOpen, GitCommit, Clock } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
          const overview = await api.getDashboardOverview();
          setData(overview);
        } else {
          const personal = await api.getDashboardPersonal();
          setData(personal);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-orion-primary">Carregando dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-orion-text-muted">Erro ao carregar dashboard</div>;
  }

  // HEAD/ADMIN view
  if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
    return <HeadDashboard data={data} />;
  }

  // DEV view
  return <DevDashboard data={data} />;
}

function HeadDashboard({ data }: { data: any }) {
  const hoursChartData = data.hoursPerDev?.map((d: any) => ({
    name: d.name,
    horas: d.hoursThisWeek,
    commits: d.commitsThisWeek,
  })) || [];

  const projectChartData = data.projects?.map((p: any, i: number) => ({
    name: p.name,
    value: p.progress || 1,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="space-y-3">
          {data.alerts.map((alert: any, i: number) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                alert.severity === 'critical'
                  ? 'bg-orion-danger/10 border-orion-danger/30 text-orion-danger'
                  : 'bg-orion-warning/10 border-orion-warning/30 text-orion-warning'
              }`}
            >
              <AlertTriangle size={20} />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard icon={FolderOpen} label="Projetos Ativos" value={data.summary?.totalActiveProjects || 0} color="text-orion-primary" />
        <SummaryCard icon={Users} label="Devs" value={data.summary?.totalDevs || 0} color="text-orion-purple" />
        <SummaryCard icon={Clock} label="Horas esta Semana" value={`${data.summary?.totalHoursThisWeek || 0}h`} color="text-orion-accent" />
        <SummaryCard icon={GitCommit} label="Commits Totais" value={hoursChartData.reduce((s: number, d: any) => s + d.commits, 0)} color="text-orion-success" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours per Dev */}
        <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h3 className="text-lg font-semibold mb-4">Horas por Dev (Semana)</h3>
          {hoursChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hoursChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="horas" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="commits" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-orion-text-muted text-center py-12">Sem dados para exibir</p>
          )}
        </div>

        {/* Project Progress */}
        <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h3 className="text-lg font-semibold mb-4">Progresso dos Projetos</h3>
          {projectChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${value}%)`}
                >
                  {projectChartData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-orion-text-muted text-center py-12">Sem projetos ativos</p>
          )}
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h3 className="text-lg font-semibold mb-4">Projetos Ativos</h3>
        <div className="space-y-3">
          {data.projects?.map((project: any) => (
            <div key={project.id} className="flex items-center justify-between p-4 bg-orion-surface-light rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{project.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.priority === 'URGENT' ? 'bg-orion-danger/20 text-orion-danger' :
                    project.priority === 'HIGH' ? 'bg-orion-warning/20 text-orion-warning' :
                    'bg-orion-primary/20 text-orion-primary-light'
                  }`}>
                    {project.priority}
                  </span>
                </div>
                <p className="text-sm text-orion-text-muted mt-1">
                  {project.members?.map((m: any) => m.name).join(', ')} &middot; {project.tasksDone}/{project.tasksTotal} tarefas
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 bg-orion-bg rounded-full h-2">
                  <div
                    className="bg-orion-primary h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right">{project.progress}%</span>
              </div>
            </div>
          ))}
          {(!data.projects || data.projects.length === 0) && (
            <p className="text-orion-text-muted text-center py-8">Nenhum projeto ativo</p>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
        <div className="space-y-3">
          {data.recentActivities?.slice(0, 10).map((activity: any) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-orion-surface-light transition-colors">
              <div className="w-8 h-8 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-xs font-bold shrink-0 mt-0.5">
                {activity.user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.user?.name}</span>
                  <span className="text-orion-text-muted"> em </span>
                  <span className="text-orion-primary-light">{activity.project?.name}</span>
                </p>
                <p className="text-sm text-orion-text-muted mt-0.5">{activity.description}</p>
                {activity.type === 'AI_SUMMARY' && (
                  <span className="inline-flex items-center gap-1 text-xs text-orion-accent mt-1">
                    <TrendingUp size={12} /> Resumo IA
                  </span>
                )}
              </div>
              <span className="text-xs text-orion-text-muted shrink-0">
                {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {(!data.recentActivities || data.recentActivities.length === 0) && (
            <p className="text-orion-text-muted text-center py-8">Nenhuma atividade recente</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DevDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard icon={FolderOpen} label="Meus Projetos" value={data.projects?.length || 0} color="text-orion-primary" />
        <SummaryCard icon={Clock} label="Horas esta Semana" value={`${data.hoursThisWeek || 0}h`} color="text-orion-accent" />
        <SummaryCard icon={GitCommit} label="Commits Recentes" value={data.recentCommits?.length || 0} color="text-orion-success" />
      </div>

      {/* My Tasks */}
      <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h3 className="text-lg font-semibold mb-4">Minhas Tarefas</h3>
        <div className="space-y-2">
          {data.tasks?.map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-orion-surface-light rounded-xl">
              <div>
                <p className="font-medium text-sm">{task.title}</p>
                <p className="text-xs text-orion-text-muted">{task.project?.name}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${
                task.status === 'IN_PROGRESS' ? 'bg-orion-primary/20 text-orion-primary-light' :
                task.status === 'IN_REVIEW' ? 'bg-orion-warning/20 text-orion-warning' :
                'bg-orion-surface border border-orion-border text-orion-text-muted'
              }`}>
                {task.status === 'TODO' ? 'A Fazer' : task.status === 'IN_PROGRESS' ? 'Em Progresso' : task.status === 'IN_REVIEW' ? 'Em Revisão' : 'Concluída'}
              </span>
            </div>
          ))}
          {(!data.tasks || data.tasks.length === 0) && (
            <p className="text-orion-text-muted text-center py-6">Nenhuma tarefa pendente</p>
          )}
        </div>
      </div>

      {/* Recent Commits (AI Summaries) */}
      <div className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h3 className="text-lg font-semibold mb-4">Commits Recentes (Resumo IA)</h3>
        <div className="space-y-3">
          {data.recentCommits?.map((commit: any) => (
            <div key={commit.id} className="p-3 bg-orion-surface-light rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <GitCommit size={14} className="text-orion-purple" />
                <span className="text-xs text-orion-text-muted font-mono">{commit.sha?.substring(0, 7)}</span>
                <span className="text-xs text-orion-text-muted">&middot; {commit.project?.name}</span>
              </div>
              <p className="text-sm">{commit.aiSummary || commit.message}</p>
              <p className="text-xs text-orion-text-muted mt-1">
                {new Date(commit.committedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          {(!data.recentCommits || data.recentCommits.length === 0) && (
            <p className="text-orion-text-muted text-center py-6">Nenhum commit recente</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="bg-orion-surface rounded-2xl border border-orion-border p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-orion-surface-light ${color}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-orion-text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
