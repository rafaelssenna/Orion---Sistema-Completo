'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Plus, Send, GitCommit, TrendingUp, AlertCircle, Package, FileText } from 'lucide-react';

const typeIcons: Record<string, any> = {
  UPDATE: FileText,
  NOTE: FileText,
  BLOCKER: AlertCircle,
  DELIVERY: Package,
  AI_SUMMARY: TrendingUp,
};

const typeLabels: Record<string, string> = {
  UPDATE: 'Atualização',
  NOTE: 'Nota',
  BLOCKER: 'Bloqueio',
  DELIVERY: 'Entrega',
  AI_SUMMARY: 'Resumo IA',
};

const typeColors: Record<string, string> = {
  UPDATE: 'text-orion-primary',
  NOTE: 'text-orion-text-muted',
  BLOCKER: 'text-orion-danger',
  DELIVERY: 'text-orion-success',
  AI_SUMMARY: 'text-orion-accent',
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('UPDATE');
  const [hoursSpent, setHoursSpent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [acts, projs] = await Promise.all([
        api.getActivities(),
        api.getProjects(),
      ]);
      setActivities(acts);
      setProjects(projs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !description.trim()) return;
    setSubmitting(true);

    try {
      await api.createActivity({
        projectId,
        description,
        type,
        hoursSpent: hoursSpent ? parseFloat(hoursSpent) : undefined,
      });
      setDescription('');
      setHoursSpent('');
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-orion-primary">Carregando atividades...</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="text-orion-text-muted">Registro de atividades e progresso</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          Registrar Atividade
        </button>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h3 className="font-semibold mb-4">Nova Atividade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Projeto *</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
                required
              >
                <option value="">Selecione...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-orion-text-muted mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
                >
                  <option value="UPDATE">Atualização</option>
                  <option value="NOTE">Nota</option>
                  <option value="BLOCKER">Bloqueio</option>
                  <option value="DELIVERY">Entrega</option>
                </select>
              </div>
              <div className="w-28">
                <label className="block text-sm text-orion-text-muted mb-1">Horas</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={hoursSpent}
                  onChange={e => setHoursSpent(e.target.value)}
                  className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-orion-text-muted mb-1">O que você fez? *</label>
            <div className="flex gap-3">
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="flex-1 bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
                placeholder="Ex: Implementei a tela de login com validação..."
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Activity Feed */}
      <div className="bg-orion-surface rounded-2xl border border-orion-border overflow-hidden">
        <div className="divide-y divide-orion-border">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.type] || FileText;
            return (
              <div key={activity.id} className="flex items-start gap-4 p-5 hover:bg-orion-surface-light/50 transition-colors">
                <div className={`p-2 rounded-xl bg-orion-surface-light ${typeColors[activity.type]}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.user?.name}</span>
                    <span className="text-orion-text-muted text-xs">&middot;</span>
                    <span className="text-orion-primary-light text-sm">{activity.project?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activity.type === 'AI_SUMMARY' ? 'bg-orion-accent/20 text-orion-accent' :
                      activity.type === 'BLOCKER' ? 'bg-orion-danger/20 text-orion-danger' :
                      'bg-orion-surface-light text-orion-text-muted'
                    }`}>
                      {typeLabels[activity.type]}
                    </span>
                  </div>
                  <p className="text-sm text-orion-text">{activity.description}</p>
                  {activity.hoursSpent && (
                    <span className="text-xs text-orion-accent mt-1 inline-block">{activity.hoursSpent}h</span>
                  )}
                </div>
                <span className="text-xs text-orion-text-muted shrink-0">
                  {new Date(activity.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="text-center py-16 text-orion-text-muted">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma atividade registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
