'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  Clock, GitCommit, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  FolderOpen, ChevronDown, ChevronUp, Zap, Target, PauseCircle,
} from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const TOOLTIP_STYLE = { background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', fontSize: '12px' };

type Period = 'today' | 'week' | 'month';

export default function MetricsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [expandedStalled, setExpandedStalled] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'HEAD' && user?.role !== 'ADMIN') return;
    loadMetrics(period);
  }, [user, period]);

  const loadMetrics = async (p: Period) => {
    setLoading(true);
    try {
      const result = await api.getStrategicMetrics(p);
      setData(result);
    } catch (err) {
      console.error('Metrics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'HEAD' && user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-orion-text-muted">Acesso restrito a Head e Admin.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-orion-primary">Carregando métricas...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-orion-text-muted">Sem dados disponíveis.</p>
      </div>
    );
  }

  const { projectEffort, devTimeDistribution, stalledProjects, insights, totals } = data;

  // Prepare stacked area data for daily timeline
  const allDates = new Set<string>();
  projectEffort.forEach((p: any) => p.dailyBreakdown.forEach((d: any) => allDates.add(d.date)));
  const sortedDates = Array.from(allDates).sort();
  const projectNames = projectEffort.map((p: any) => p.projectName);

  const dailyTimelineData = sortedDates.map(date => {
    const row: any = { date: formatDate(date) };
    projectEffort.forEach((p: any) => {
      const day = p.dailyBreakdown.find((d: any) => d.date === date);
      row[p.projectName] = day ? day.commits : 0;
    });
    return row;
  });

  // Prepare dev stacked bar data
  const devBarData = devTimeDistribution.map((dev: any) => {
    const row: any = { name: dev.user.name.split(' ')[0] };
    dev.projectBreakdown.forEach((pb: any) => {
      row[pb.projectName] = Math.round((pb.estimatedMinutes / 60) * 10) / 10;
    });
    return row;
  });
  const allProjectNamesFromDevs = new Set<string>();
  devTimeDistribution.forEach((dev: any) =>
    dev.projectBreakdown.forEach((pb: any) => allProjectNamesFromDevs.add(pb.projectName))
  );

  // Horizontal bar data for project effort
  const projectBarData = projectEffort.map((p: any) => ({
    name: p.projectName.length > 20 ? p.projectName.substring(0, 20) + '...' : p.projectName,
    fullName: p.projectName,
    hours: p.estimatedHours,
    commits: p.totalCommits,
  }));

  return (
    <div className="space-y-8">
      {/* Header + Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Métricas Estratégicas</h1>
          <p className="text-orion-text-muted">Visão automática baseada em commits do GitHub</p>
        </div>
        <div className="flex items-center bg-orion-surface rounded-xl border border-orion-border p-1">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
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
        <SummaryCard
          icon={<Clock size={20} />}
          label="Tempo Estimado"
          value={`${totals.totalEstimatedHours}h`}
          color="text-orion-primary"
        />
        <SummaryCard
          icon={<GitCommit size={20} />}
          label="Total de Commits"
          value={totals.totalCommits}
          sub={`~${totals.averageCommitsPerDay}/dia`}
          color="text-orion-purple"
        />
        <SummaryCard
          icon={<Zap size={20} />}
          label="Projeto Mais Ativo"
          value={totals.mostActiveProject?.name || '-'}
          sub={totals.mostActiveProject ? `${totals.mostActiveProject.commits} commits` : ''}
          color="text-orion-success"
        />
        <SummaryCard
          icon={<PauseCircle size={20} />}
          label="Projetos Parados"
          value={stalledProjects.length}
          color={stalledProjects.length > 0 ? 'text-orion-danger' : 'text-orion-success'}
        />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-orion-text-muted flex items-center gap-2">
            <Lightbulb size={16} /> Insights Automáticos
          </h2>
          <div className="flex flex-wrap gap-2">
            {insights.map((insight: any, i: number) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm ${
                  insight.severity === 'critical'
                    ? 'bg-orion-danger/10 border-orion-danger/30 text-orion-danger'
                    : insight.severity === 'warning'
                    ? 'bg-orion-warning/10 border-orion-warning/30 text-orion-warning'
                    : 'bg-orion-primary/10 border-orion-primary/30 text-orion-primary-light'
                }`}
              >
                {insight.type === 'trending_up' ? <TrendingUp size={14} /> :
                 insight.type === 'trending_down' ? <TrendingDown size={14} /> :
                 insight.type === 'imbalance' ? <AlertTriangle size={14} /> :
                 insight.type === 'concentration' ? <Target size={14} /> :
                 <AlertTriangle size={14} />}
                {insight.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Effort Distribution */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderOpen size={20} className="text-orion-primary" />
          Distribuição de Esforço por Projeto
        </h2>

        {projectBarData.length > 0 ? (
          <div className="mb-6" style={{ height: Math.max(200, projectBarData.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectBarData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="name" type="category" width={160} stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: string) => [
                  name === 'hours' ? `${v}h` : v,
                  name === 'hours' ? 'Tempo Estimado' : 'Commits'
                ]} />
                <Bar dataKey="hours" fill="#6366f1" radius={[0, 8, 8, 0]} name="hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-orion-text-muted text-center py-8">Sem dados no período selecionado.</p>
        )}

        {/* Project Table */}
        {projectEffort.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-orion-text-muted border-b border-orion-border">
                  <th className="text-left py-3 px-2">Projeto</th>
                  <th className="text-center py-3 px-2">Commits</th>
                  <th className="text-center py-3 px-2">Tempo Est.</th>
                  <th className="text-center py-3 px-2">% Esforço</th>
                  <th className="text-center py-3 px-2">Último Commit</th>
                </tr>
              </thead>
              <tbody>
                {projectEffort.map((p: any, i: number) => (
                  <tr key={p.projectId} className="border-b border-orion-border/50 hover:bg-orion-surface-light transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{p.projectName}</span>
                        {p.members.map((m: any) => (
                          <span key={m.id} className="text-xs text-orion-text-muted bg-orion-surface-light px-1.5 py-0.5 rounded">
                            {m.name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 font-mono">{p.totalCommits}</td>
                    <td className="text-center py-3 px-2 font-mono">{p.estimatedHours}h</td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-orion-surface-light rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.percentageOfTotal}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <span className="text-xs text-orion-text-muted">{p.percentageOfTotal}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-orion-text-muted text-xs">
                      {p.daysSinceLastCommit === 0 ? 'Hoje' :
                       p.daysSinceLastCommit === 1 ? 'Ontem' :
                       p.daysSinceLastCommit > 0 ? `${p.daysSinceLastCommit} dias atrás` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dev Time Distribution */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-orion-accent" />
          Tempo por Desenvolvedor
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stacked Bar */}
          {devBarData.length > 0 && (
            <div>
              <h3 className="text-sm text-orion-text-muted mb-3">Horas estimadas por projeto</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={devBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}h`, '']} />
                    {Array.from(allProjectNamesFromDevs).map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
                    ))}
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-dev pie charts */}
          <div className="space-y-4">
            <h3 className="text-sm text-orion-text-muted mb-3">Distribuição % por dev</h3>
            {devTimeDistribution.map((dev: any) => (
              <div key={dev.user.id} className="flex items-center gap-4 p-3 bg-orion-surface-light rounded-xl">
                <div className="w-10 h-10 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary font-bold text-sm">
                  {dev.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{dev.user.name}</p>
                  <p className="text-xs text-orion-text-muted">
                    {dev.totalCommits} commits &middot; ~{dev.totalEstimatedHours}h
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {dev.projectBreakdown.slice(0, 4).map((pb: any, i: number) => (
                    <div key={pb.projectId} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-orion-text-muted">
                        {pb.projectName.split(' ')[0]} {pb.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Timeline */}
      {dailyTimelineData.length > 1 && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-orion-success" />
            Timeline Diária de Commits
          </h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimelineData}>
                <defs>
                  {projectNames.map((name: string, i: number) => (
                    <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                {projectNames.map((name: string, i: number) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stackId="1"
                    stroke={COLORS[i % COLORS.length]}
                    fill={`url(#grad-${i})`}
                  />
                ))}
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Stalled Projects */}
      {stalledProjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle size={20} className="text-orion-danger" />
            Projetos Parados
          </h2>
          {stalledProjects.map((sp: any) => (
            <div
              key={sp.projectId}
              className={`bg-orion-surface rounded-2xl border-l-4 border border-orion-border p-5 ${
                sp.severity === 'critical' ? 'border-l-orion-danger' : 'border-l-amber-500'
              }`}
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedStalled(expandedStalled === sp.projectId ? null : sp.projectId)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold">{sp.projectName}</h3>
                    <p className="text-sm text-orion-text-muted">
                      {sp.daysSinceLastCommit} dias sem commits
                      {sp.commitTrend === 'declining' && ' (tendência de queda)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {sp.assignedDevs.map((d: any) => (
                      <span key={d.id} className="text-xs bg-orion-surface-light px-2 py-1 rounded-full text-orion-text-muted ml-1">
                        {d.name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    sp.severity === 'critical'
                      ? 'bg-orion-danger/20 text-orion-danger'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {sp.severity === 'critical' ? 'Crítico' : 'Atenção'}
                  </span>
                  {expandedStalled === sp.projectId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedStalled === sp.projectId && (
                <div className="mt-4 pt-4 border-t border-orion-border space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-orion-text-muted mb-1">Último Commit</p>
                      {sp.lastCommit ? (
                        <div className="bg-orion-surface-light rounded-lg p-3">
                          <p className="font-mono text-xs text-orion-primary">{sp.lastCommit.sha.substring(0, 7)}</p>
                          <p className="text-sm mt-1">{sp.lastCommit.aiSummary || sp.lastCommit.message}</p>
                          <p className="text-xs text-orion-text-muted mt-1">
                            {new Date(sp.lastCommit.committedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-orion-text-muted">Nenhum commit encontrado</p>
                      )}
                    </div>
                    <div>
                      <p className="text-orion-text-muted mb-1">Última Atividade</p>
                      {sp.lastActivity ? (
                        <div className="bg-orion-surface-light rounded-lg p-3">
                          <p className="text-sm">{sp.lastActivity.description}</p>
                          <p className="text-xs text-orion-text-muted mt-1">
                            {sp.lastActivity.userName} &middot; {new Date(sp.lastActivity.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-orion-text-muted">Nenhuma atividade registrada</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-orion-text-muted">
                    Total histórico: {sp.totalCommitsAllTime} commits
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-orion-surface rounded-2xl border border-orion-border p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-orion-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-orion-text-muted mt-1">{sub}</p>}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
