'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { FolderOpen, Plus, Users, GitBranch, ChevronRight, Github } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-orion-success/20 text-orion-success',
    PAUSED: 'bg-orion-warning/20 text-orion-warning',
    COMPLETED: 'bg-orion-text-muted/20 text-orion-text-muted',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    COMPLETED: 'Concluído',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-orion-primary">Carregando projetos...</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-orion-text-muted">Gerencie todos os projetos da equipe</p>
        </div>
        {(user?.role === 'HEAD' || user?.role === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            Novo Projeto
          </button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/kanban?projectId=${project.id}`}
            className="bg-orion-surface rounded-2xl border border-orion-border p-6 hover:border-orion-primary/50 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-xl bg-orion-primary/10">
                <FolderOpen size={22} className="text-orion-primary" />
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[project.status]}`}>
                {statusLabels[project.status]}
              </span>
            </div>

            <h3 className="font-semibold text-lg mb-1 group-hover:text-orion-primary-light transition-colors">
              {project.name}
            </h3>
            {project.clientName && (
              <p className="text-sm text-orion-text-muted mb-3">Cliente: {project.clientName}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-orion-text-muted">
              <span className="flex items-center gap-1">
                <Users size={14} /> {project.members?.length || 0}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch size={14} /> {project._count?.gitCommits || 0} commits
              </span>
            </div>

            {/* Members avatars */}
            <div className="flex items-center gap-1 mt-4">
              {project.members?.slice(0, 4).map((member: any) => (
                <div
                  key={member.user.id}
                  className="w-7 h-7 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-xs font-bold border-2 border-orion-surface"
                  title={member.user.name}
                >
                  {member.user.name.charAt(0)}
                </div>
              ))}
              <ChevronRight size={16} className="text-orion-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-16 text-orion-text-muted">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum projeto encontrado</p>
            {(user?.role === 'HEAD' || user?.role === 'ADMIN') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-orion-primary hover:text-orion-primary-light"
              >
                Criar primeiro projeto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadProjects(); }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRepos = async () => {
      setLoadingRepos(true);
      try {
        const repos = await api.getAvailableRepos();
        setAvailableRepos(repos);
      } catch {
        // Token not configured - silently fail
      } finally {
        setLoadingRepos(false);
      }
    };
    loadRepos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.createProject({
        name,
        description,
        clientName,
        priority,
        ...(selectedRepo && { repoFullName: selectedRepo }),
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-orion-surface rounded-2xl border border-orion-border p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold mb-4">Novo Projeto</h2>

        {error && <div className="bg-orion-danger/10 border border-orion-danger/30 text-orion-danger rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-orion-text-muted mb-1">Nome do Projeto *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-orion-text-muted mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary resize-none h-20"
            />
          </div>

          <div>
            <label className="block text-sm text-orion-text-muted mb-1">Cliente</label>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-orion-text-muted mb-1">Prioridade</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-orion-text-muted mb-1">
              <Github size={14} className="inline mr-1" />
              Repositório GitHub
            </label>
            {loadingRepos ? (
              <div className="text-sm text-orion-text-muted py-2.5 px-4 bg-orion-surface-light rounded-lg border border-orion-border">
                Carregando repositórios...
              </div>
            ) : availableRepos.length > 0 ? (
              <select
                value={selectedRepo}
                onChange={e => setSelectedRepo(e.target.value)}
                className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
              >
                <option value="">Nenhum (conectar depois)</option>
                {availableRepos.filter(r => !r.connectedProjectId).map(repo => (
                  <option key={repo.fullName} value={repo.fullName}>
                    {repo.fullName}{repo.private ? ' (privado)' : ''}{repo.language ? ` - ${repo.language}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-orion-text-muted py-2">
                Configure o token GitHub nas Configurações para listar repositórios.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-orion-border text-orion-text-muted hover:bg-orion-surface-light transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-orion-primary hover:bg-orion-primary-light text-white font-medium transition-colors disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
