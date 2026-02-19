'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ArrowLeft, Settings, Trash2, Users, Plus, GitBranch, RefreshCw, Github, Save, X } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const isManager = user?.role === 'HEAD' || user?.role === 'ADMIN';

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const [proj, cmts] = await Promise.all([
        api.getProject(id as string),
        api.getCommits(id as string).catch(() => []),
      ]);
      setProject(proj);
      setCommits(cmts);
      setEditName(proj.name);
      setEditDescription(proj.description || '');
      setEditClientName(proj.clientName || '');
      setEditStatus(proj.status);
      setEditPriority(proj.priority);

      if (isManager) {
        const orgData = await api.getMyOrganization().catch(() => null);
        if (orgData?.users) {
          setOrgUsers(orgData.users);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProject(id as string, {
        name: editName,
        description: editDescription || undefined,
        clientName: editClientName || undefined,
        status: editStatus,
        priority: editPriority,
      });
      setMessage('Projeto atualizado!');
      setEditing(false);
      loadProject();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deleteProject(id as string);
      router.push('/projects');
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.addProjectMember(id as string, userId);
      setMessage('Membro adicionado!');
      loadProject();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name} do projeto?`)) return;
    try {
      await api.removeProjectMember(id as string, userId);
      setMessage(`${name} removido do projeto`);
      loadProject();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    }
  };

  const handleSync = async (repoId: string, full = false) => {
    setSyncingRepo(repoId);
    try {
      const result = await api.syncRepo(repoId, full);
      setMessage(`Sincronizado! ${result.newCommits} novos commits.`);
      loadProject();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setSyncingRepo(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-orion-primary">Carregando...</div></div>;
  }

  if (!project) {
    return <div className="text-center py-16 text-orion-text-muted">Projeto não encontrado</div>;
  }

  const memberIds = new Set(project.members?.map((m: any) => m.user.id) || []);
  const availableUsers = orgUsers.filter(u => !memberIds.has(u.id));

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-orion-success/20 text-orion-success',
    PAUSED: 'bg-orion-warning/20 text-orion-warning',
    COMPLETED: 'bg-orion-text-muted/20 text-orion-text-muted',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects" className="p-2 rounded-lg hover:bg-orion-surface-light transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[project.status]}`}>
              {project.status === 'ACTIVE' ? 'Ativo' : project.status === 'PAUSED' ? 'Pausado' : 'Concluído'}
            </span>
            {project.clientName && <span className="text-sm text-orion-text-muted">Cliente: {project.clientName}</span>}
          </div>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orion-border text-sm hover:bg-orion-surface-light transition-colors"
            >
              <Settings size={16} /> {editing ? 'Cancelar' : 'Editar'}
            </button>
            {user?.role === 'HEAD' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orion-danger/30 text-orion-danger text-sm hover:bg-orion-danger/10 transition-colors"
              >
                <Trash2 size={16} /> Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm ${message.startsWith('Erro') ? 'bg-orion-danger/10 border border-orion-danger/30 text-orion-danger' : 'bg-orion-success/10 border border-orion-success/30 text-orion-success'}`}>
          {message}
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h2 className="text-lg font-semibold mb-4">Editar Projeto</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Nome</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary" />
            </div>
            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Descrição</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary resize-none h-20" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-orion-text-muted mb-1">Cliente</label>
                <input value={editClientName} onChange={e => setEditClientName(e.target.value)} className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary" />
              </div>
              <div>
                <label className="block text-sm text-orion-text-muted mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary">
                  <option value="ACTIVE">Ativo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="COMPLETED">Concluído</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-orion-text-muted mb-1">Prioridade</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary">
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-orion-primary" />
            <h2 className="text-lg font-semibold">Membros ({project.members?.length || 0})</h2>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {project.members?.map((member: any) => (
            <div key={member.user.id} className="flex items-center gap-3 p-3 bg-orion-surface-light rounded-xl">
              <div className="w-9 h-9 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-sm font-bold">
                {member.user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{member.user.name}</p>
                <p className="text-xs text-orion-text-muted">{member.user.role}</p>
              </div>
              {isManager && (
                <button
                  onClick={() => handleRemoveMember(member.user.id, member.user.name)}
                  className="text-orion-text-muted hover:text-orion-danger transition-colors p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add member */}
        {isManager && availableUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-orion-text-muted">Adicionar:</span>
            {availableUsers.map(u => (
              <button
                key={u.id}
                onClick={() => handleAddMember(u.id)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-orion-border hover:border-orion-primary hover:text-orion-primary transition-colors"
              >
                <Plus size={12} /> {u.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* GitHub Repos & Commits */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Github size={20} className="text-orion-text" />
          <h2 className="text-lg font-semibold">GitHub</h2>
        </div>

        {/* Connected repos */}
        {project.githubRepos?.length > 0 ? (
          <div className="space-y-3 mb-4">
            {project.githubRepos.map((repo: any) => (
              <div key={repo.id} className="flex items-center justify-between p-3 bg-orion-surface-light rounded-xl">
                <div className="flex items-center gap-3">
                  <GitBranch size={16} className="text-orion-primary" />
                  <span className="text-sm font-medium">{repo.repoFullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(repo.id, true)}
                    disabled={syncingRepo === repo.id}
                    className="flex items-center gap-1 text-xs text-orion-text-muted hover:text-orion-primary disabled:opacity-50"
                  >
                    Sync Completo
                  </button>
                  <button
                    onClick={() => handleSync(repo.id)}
                    disabled={syncingRepo === repo.id}
                    className="flex items-center gap-1 text-sm text-orion-primary hover:text-orion-primary-light disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncingRepo === repo.id ? 'animate-spin' : ''} />
                    {syncingRepo === repo.id ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-orion-text-muted mb-4">Nenhum repositório conectado. Conecte um repo ao criar ou editar o projeto.</p>
        )}

        {/* Recent commits */}
        {commits.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-orion-text-muted mb-2">Commits Recentes</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {commits.slice(0, 20).map((commit: any) => (
                <div key={commit.id} className="p-3 bg-orion-surface-light rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-orion-primary font-mono">{commit.sha.slice(0, 7)}</code>
                    {commit.authorName && (
                      <span className="text-xs text-orion-text-muted">por {commit.authorName}</span>
                    )}
                    <span className="text-xs text-orion-text-muted ml-auto">
                      {new Date(commit.committedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm">
                    {commit.aiSummary || commit.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href={`/kanban?projectId=${project.id}`}
          className="flex-1 text-center py-3 rounded-xl bg-orion-primary/10 text-orion-primary hover:bg-orion-primary/20 transition-colors font-medium"
        >
          Abrir Kanban
        </Link>
        <Link
          href={`/activities?projectId=${project.id}`}
          className="flex-1 text-center py-3 rounded-xl bg-orion-purple/10 text-orion-purple hover:bg-orion-purple/20 transition-colors font-medium"
        >
          Ver Atividades
        </Link>
      </div>
    </div>
  );
}
