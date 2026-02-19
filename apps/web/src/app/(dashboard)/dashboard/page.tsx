'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Users, FolderOpen, GitCommit, Clock, Code, FileCode, Calendar, ChevronDown, ChevronUp, Target, Timer, Layers, AlertCircle, CheckCircle, Pause, Play } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [devProductivity, setDevProductivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
          const [overview, productivity] = await Promise.all([
            api.getDashboardOverview(),
            api.getDevProductivity().catch(() => []),
          ]);
          setData(overview);
          setDevProductivity(productivity);
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

  if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
    return <HeadDashboard data={data} devProductivity={devProductivity} />;
  }

  return <DevDashboard data={data} />;
}

function HeadDashboard({ data, devProductivity }: { data: any; devProductivity: any[] }) {
  const [expandedDev, setExpandedDev] = useState<string | null>(null);

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
        <SummaryCard icon={GitCommit} label="Commits Semana" value={hoursChartData.reduce((s: number, d: any) => s + d.commits, 0)} color="text-orion-success" />
      </div>

      {/* Dev Productivity - Main Feature */}
      {devProductivity.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Code size={20} className="text-orion-accent" />
            <h2 className="text-lg font-semibold">Produtividade por Funcionário</h2>
            <span className="text-xs text-orion-text-muted ml-2">(baseado nos commits do GitHub)</span>
          </div>

          <div className="space-y-3">
            {devProductivity.map((dev) => {
              const isExpanded = expandedDev === dev.user.id;

              return (
                <div key={dev.user.id} className={`bg-orion-surface rounded-2xl border transition-all ${isExpanded ? 'border-orion-accent/50' : 'border-orion-border'}`}>
                  {/* Dev Header - Always visible */}
                  <button
                    onClick={() => setExpandedDev(isExpanded ? null : dev.user.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-orion-surface-light/30 transition-colors rounded-2xl"
                  >
                    <div className="w-11 h-11 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-lg font-bold">
                      {dev.user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{dev.user.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orion-surface-light text-orion-text-muted">{dev.user.role}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-orion-text-muted">
                        <span className="flex items-center gap-1"><GitCommit size={13} /> {dev.totalCommits} commits total</span>
                        <span className="flex items-center gap-1"><Calendar size={13} /> {dev.activeDays} dias ativos</span>
                        <span className="flex items-center gap-1"><FileCode size={13} /> {dev.totalFilesChanged.toLocaleString()} arquivos</span>
                      </div>
                    </div>

                    {/* Quick stats badges */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-orion-primary">{dev.commitsThisWeek}</p>
                        <p className="text-xs text-orion-text-muted">semana</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-orion-accent">{dev.commitsThisMonth}</p>
                        <p className="text-xs text-orion-text-muted">mês</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-orion-text-muted" /> : <ChevronDown size={18} className="text-orion-text-muted" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-5 border-t border-orion-border pt-5">
                      {/* Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <MiniStat label="Commits Total" value={dev.totalCommits} />
                        <MiniStat label="Semana Atual" value={dev.commitsThisWeek} />
                        <MiniStat label="Mês Atual" value={dev.commitsThisMonth} />
                        <MiniStat label="Linhas +" value={`+${dev.totalAdditions.toLocaleString()}`} color="text-orion-success" />
                        <MiniStat label="Linhas -" value={`-${dev.totalDeletions.toLocaleString()}`} color="text-orion-danger" />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Weekly History Chart */}
                        <div>
                          <h4 className="text-sm font-medium text-orion-text-muted mb-3">Commits por Semana (últimas 12 semanas)</h4>
                          <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={dev.weeklyHistory}>
                              <defs>
                                <linearGradient id={`grad-${dev.user.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                              <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', fontSize: '12px' }} />
                              <Area type="monotone" dataKey="commits" stroke="#6366f1" fill={`url(#grad-${dev.user.id})`} strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Commits by Project */}
                        <div>
                          <h4 className="text-sm font-medium text-orion-text-muted mb-3">Commits por Projeto</h4>
                          <div className="space-y-2">
                            {dev.commitsByProject.slice(0, 6).map((cp: any, i: number) => {
                              const percentage = dev.totalCommits > 0 ? Math.round((cp.commits / dev.totalCommits) * 100) : 0;
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-sm text-orion-text w-32 truncate">{cp.projectName}</span>
                                  <div className="flex-1 bg-orion-bg rounded-full h-2.5">
                                    <div
                                      className="h-2.5 rounded-full transition-all"
                                      style={{ width: `${percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                  </div>
                                  <span className="text-xs text-orion-text-muted w-16 text-right">{cp.commits} ({percentage}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Hour Distribution & Day Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Hour heatmap */}
                        <div>
                          <h4 className="text-sm font-medium text-orion-text-muted mb-3">Horário de Atividade (UTC)</h4>
                          <div className="flex flex-wrap gap-1">
                            {dev.hourDistribution.map((count: number, hour: number) => {
                              const max = Math.max(...dev.hourDistribution);
                              const intensity = max > 0 ? count / max : 0;
                              return (
                                <div
                                  key={hour}
                                  className="relative group"
                                  title={`${hour}h: ${count} commits`}
                                >
                                  <div
                                    className="w-7 h-7 rounded flex items-center justify-center text-[10px]"
                                    style={{
                                      backgroundColor: intensity === 0 ? '#1e293b' : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`,
                                      color: intensity > 0.3 ? '#fff' : '#94a3b8',
                                    }}
                                  >
                                    {hour}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Day distribution */}
                        <div>
                          <h4 className="text-sm font-medium text-orion-text-muted mb-3">Dia da Semana</h4>
                          <div className="flex items-end gap-2 h-24">
                            {dev.dayDistribution.map((count: number, day: number) => {
                              const max = Math.max(...dev.dayDistribution);
                              const height = max > 0 ? (count / max) * 100 : 0;
                              return (
                                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-orion-text-muted">{count}</span>
                                  <div
                                    className="w-full rounded-t transition-all"
                                    style={{ height: `${Math.max(height, 4)}%`, backgroundColor: day === 0 || day === 6 ? '#f59e0b' : '#6366f1' }}
                                  />
                                  <span className="text-[10px] text-orion-text-muted">{DAY_NAMES[day]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      {dev.firstCommit && (
                        <div className="flex items-center gap-4 text-xs text-orion-text-muted pt-2 border-t border-orion-border">
                          <span>Primeiro commit: {new Date(dev.firstCommit).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          <span>&middot;</span>
                          <span>Último commit: {new Date(dev.lastCommit).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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

type DevPeriod = 'today' | 'week' | 'month';

function DevDashboard({ data: _legacyData }: { data: any }) {
  const { user } = useAuth();
  const [timeData, setTimeData] = useState<any>(null);
  const [period, setPeriod] = useState<DevPeriod>('week');
  const [loadingTime, setLoadingTime] = useState(true);

  useEffect(() => {
    loadTimeData(period);
  }, [period]);

  const loadTimeData = async (p: DevPeriod) => {
    setLoadingTime(true);
    try {
      const result = await api.getDevTimeManagement(p);
      setTimeData(result);
    } catch (err) {
      console.error('Dev time management error:', err);
    } finally {
      setLoadingTime(false);
    }
  };

  const handleToggleProjectStatus = async (projectId: string, currentlyActive: boolean) => {
    const newStatus = currentlyActive ? 'PAUSED' : 'ACTIVE';
    if (currentlyActive && !confirm('Pausar este projeto? Ele não aparecerá mais nas métricas ativas.')) return;
    try {
      await api.updateProjectStatus(projectId, newStatus);
      loadTimeData(period);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (loadingTime || !timeData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-orion-primary">Carregando gestão de tempo...</div>
      </div>
    );
  }

  const { summary, projectDistribution, dailyTimeline, recentSessions, neglectedProjects, balanceAlerts } = timeData;

  // Prepare pie chart data — use effortScore for slice size (weighted by code changes)
  const pieData = projectDistribution
    .filter((p: any) => p.commits > 0)
    .map((p: any, i: number) => ({
      name: p.projectName,
      value: p.effortScore || p.estimatedMinutes,
      percentage: p.percentage,
      additions: p.totalAdditions || 0,
      deletions: p.totalDeletions || 0,
      color: COLORS[i % COLORS.length],
    }));

  // Prepare daily timeline stacked bar data
  const allProjectNames = projectDistribution.map((p: any) => p.projectName);
  const dailyBarData = dailyTimeline.map((d: any) => {
    const row: any = { date: d.dayName, fullDate: d.date };
    allProjectNames.forEach((name: string) => {
      const proj = d.projects.find((p: any) => p.projectName === name);
      row[name] = proj ? Math.round((proj.estimatedMinutes / 60) * 10) / 10 : 0;
    });
    row.totalHours = Math.round((d.totalMinutes / 60) * 10) / 10;
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-orion-text-muted">Veja como está sua distribuição de tempo</p>
        </div>
        <div className="flex items-center bg-orion-surface rounded-xl border border-orion-border p-1">
          {(['today', 'week', 'month'] as DevPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-orion-primary text-white'
                  : 'text-orion-text-muted hover:text-orion-text'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Clock} label="Tempo Estimado" value={`~${summary.totalEstimatedHours}h`} color="text-orion-primary" />
        <SummaryCard icon={GitCommit} label="Commits" value={summary.totalCommits} color="text-orion-purple" />
        <SummaryCard icon={FolderOpen} label="Projetos Ativos" value={summary.activeProjects} color="text-orion-accent" />
        <SummaryCard icon={Layers} label="Sessões de Trabalho" value={summary.totalSessions} color="text-orion-success" />
      </div>

      {/* Balance Alerts */}
      {balanceAlerts.length > 0 && (
        <div className="space-y-2">
          {balanceAlerts.map((alert: any, i: number) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm ${
                alert.type === 'good_balance'
                  ? 'bg-orion-success/10 border-orion-success/30 text-orion-success'
                  : alert.severity === 'warning'
                  ? 'bg-orion-warning/10 border-orion-warning/30 text-orion-warning'
                  : 'bg-orion-primary/10 border-orion-primary/30 text-orion-primary-light'
              }`}
            >
              {alert.type === 'good_balance' ? <CheckCircle size={18} /> :
               alert.type === 'concentration' ? <Target size={18} /> :
               <AlertCircle size={18} />}
              <span className="font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Project Distribution: PieChart + List */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} className="text-orion-primary" />
          Distribuição do Tempo por Projeto
        </h2>

        {pieData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    labelLine={true}
                  >
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any, name: any, props: any) => {
                      const entry = props.payload;
                      return [`${entry.percentage}% do esforço`, entry.name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Project List with progress bars */}
            <div className="space-y-3 flex flex-col justify-center">
              {projectDistribution.map((p: any, i: number) => (
                <div key={p.projectId} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{p.projectName}</span>
                      <span className="text-sm text-orion-text-muted ml-2">{p.estimatedHours}h ({p.percentage}%)</span>
                    </div>
                    <div className="w-full bg-orion-bg rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${p.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-orion-text-muted">{p.commits} commits</span>
                      {(p.totalAdditions > 0 || p.totalDeletions > 0) && (
                        <span className="text-xs text-orion-text-muted">
                          <span className="text-green-400">+{p.totalAdditions}</span>
                          {' / '}
                          <span className="text-red-400">-{p.totalDeletions}</span>
                          {' linhas'}
                        </span>
                      )}
                      <span className="text-xs text-orion-text-muted">
                        {p.daysSinceLastCommit === 0 ? 'Último: hoje' :
                         p.daysSinceLastCommit === 1 ? 'Último: ontem' :
                         p.daysSinceLastCommit > 0 ? `Último: ${p.daysSinceLastCommit}d atrás` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleProjectStatus(p.projectId, true)}
                    className="shrink-0 p-1.5 rounded-lg text-orion-text-muted hover:text-orion-warning hover:bg-orion-warning/10 transition-colors"
                    title="Pausar projeto"
                  >
                    <Pause size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-orion-text-muted text-center py-8">Sem commits no período selecionado.</p>
        )}
      </section>

      {/* Daily Timeline */}
      {dailyBarData.length > 1 && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-orion-accent" />
            Timeline da Semana
          </h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'horas', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(v: any) => [`${v}h`, '']}
                />
                {allProjectNames.map((name: string, i: number) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === allProjectNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Work Sessions */}
      {recentSessions.length > 0 && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer size={20} className="text-orion-success" />
            Sessões de Trabalho Recentes
          </h2>
          <div className="space-y-2">
            {recentSessions.map((s: any, i: number) => {
              const hours = Math.floor(s.durationMinutes / 60);
              const mins = s.durationMinutes % 60;
              const durationStr = hours > 0 ? `${hours}h${mins > 0 ? `${mins}min` : ''}` : `${mins}min`;
              const projIndex = projectDistribution.findIndex((p: any) => p.projectName === s.projectName);

              return (
                <div key={i} className="flex items-center gap-4 p-3 bg-orion-surface-light rounded-xl">
                  <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: COLORS[(projIndex >= 0 ? projIndex : i) % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.projectName}</span>
                      <span className="text-xs text-orion-text-muted bg-orion-surface px-2 py-0.5 rounded">{s.commitCount} commits</span>
                    </div>
                    <p className="text-xs text-orion-text-muted mt-0.5">{s.label}</p>
                  </div>
                  <span className="text-sm font-semibold text-orion-primary shrink-0">{durationStr}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Neglected Projects */}
      {neglectedProjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle size={20} className="text-orion-warning" />
            Projetos sem Atenção
          </h2>
          {neglectedProjects.map((np: any) => (
            <div
              key={np.projectId}
              className={`bg-orion-surface rounded-2xl border-l-4 border border-orion-border p-5 ${
                np.severity === 'critical' ? 'border-l-orion-danger' : 'border-l-amber-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{np.projectName}</h3>
                  <p className="text-sm text-orion-text-muted">
                    {np.daysSinceLastCommit} dias sem commits
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  np.severity === 'critical'
                    ? 'bg-orion-danger/20 text-orion-danger'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {np.severity === 'critical' ? 'Crítico' : 'Atenção'}
                </span>
              </div>
              {np.lastCommitMessage && (
                <p className="text-sm text-orion-text-muted mt-2 bg-orion-surface-light rounded-lg p-2">
                  Último: {np.lastCommitMessage}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-orion-surface-light rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color || 'text-orion-text'}`}>{value}</p>
      <p className="text-xs text-orion-text-muted">{label}</p>
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
