'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Github, RefreshCw, Users, Plus, Building2, Trash2, Wrench } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // GitHub token
  const [githubToken, setGithubToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [resyncingAll, setResyncingAll] = useState(false);
  const [fixingAuthors, setFixingAuthors] = useState(false);
  const [message, setMessage] = useState('');

  // Register new user
  const [showRegister, setShowRegister] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('DEV');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const projs = await api.getProjects();
      setProjects(projs);
      if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
        const orgData = await api.getMyOrganization();
        setOrg(orgData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;
    setSavingToken(true);
    setMessage('');

    try {
      await api.saveGithubToken(githubToken);
      setMessage('Token GitHub salvo com sucesso!');
      setGithubToken('');
      loadData();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setSavingToken(false);
    }
  };

  const handleSync = async (repoId: string) => {
    setSyncingRepo(repoId);
    try {
      const result = await api.syncRepo(repoId);
      setMessage(`Sincronizado! ${result.newCommits} novos commits.`);
    } catch (err: any) {
      setMessage(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncingRepo(null);
    }
  };

  const handleResyncAll = async () => {
    setResyncingAll(true);
    setMessage('');
    try {
      const result = await api.resyncAll();
      setMessage(`Resync completo! ${result.totalNew} novos commits de ${result.repos} repositórios.${result.failed > 0 ? ` (${result.failed} falharam)` : ''}`);
      loadData();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setResyncingAll(false);
    }
  };

  const handleFixAuthors = async () => {
    setFixingAuthors(true);
    setMessage('');
    try {
      const result = await api.fixCommitAuthors();
      setMessage(`${result.updated} commits corrigidos! Os commits agora pertencem ao DEV de cada projeto.`);
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setFixingAuthors(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setMessage('');

    try {
      await api.addOrgMember(newName, newEmail, newPassword, newRole);
      setMessage(`Membro ${newName} adicionado com sucesso!`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowRegister(false);
      loadData();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    try {
      await api.removeOrgMember(userId);
      setMessage(`${name} removido da organização`);
      loadData();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-orion-primary">Carregando...</div></div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-orion-text-muted">Gerencie integrações e equipe</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.startsWith('Erro') ? 'bg-orion-danger/10 border border-orion-danger/30 text-orion-danger' : 'bg-orion-success/10 border border-orion-success/30 text-orion-success'}`}>
          {message}
        </div>
      )}

      {/* GitHub Integration */}
      <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Github size={24} className="text-orion-text" />
          <h2 className="text-lg font-semibold">Integração GitHub</h2>
        </div>

        {/* Token status */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${org?.hasGithubToken ? 'bg-orion-success' : 'bg-orion-danger'}`} />
          <span className="text-sm text-orion-text-muted">
            {org?.hasGithubToken ? 'Token GitHub configurado' : 'Token GitHub não configurado'}
          </span>
        </div>

        {user?.role === 'HEAD' && (
          <form onSubmit={handleSaveToken} className="space-y-3 mb-6">
            <p className="text-sm text-orion-text-muted">
              Cole um Personal Access Token do GitHub com permissão de leitura de repositórios (scope: repo).
              Os repos aparecerão automaticamente ao criar projetos.
            </p>
            <div className="flex gap-3">
              <input
                type="password"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="flex-1 bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
              />
              <button
                type="submit"
                disabled={savingToken || !githubToken.trim()}
                className="bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {savingToken ? 'Salvando...' : 'Salvar Token'}
              </button>
            </div>
          </form>
        )}

        {/* Connected repos */}
        {projects.some(p => p.githubRepos?.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-orion-text-muted">Repositórios Conectados</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFixAuthors}
                  disabled={fixingAuthors}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orion-accent/10 text-orion-accent hover:bg-orion-accent/20 transition-colors disabled:opacity-50"
                >
                  <Wrench size={14} className={fixingAuthors ? 'animate-spin' : ''} />
                  {fixingAuthors ? 'Corrigindo...' : 'Corrigir Autores'}
                </button>
                <button
                  onClick={handleResyncAll}
                  disabled={resyncingAll}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orion-primary/10 text-orion-primary hover:bg-orion-primary/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={resyncingAll ? 'animate-spin' : ''} />
                  {resyncingAll ? 'Resincronizando...' : 'Resincronizar Todos'}
                </button>
              </div>
            </div>
            {projects.map(p => p.githubRepos?.map((repo: any) => (
              <div key={repo.id} className="flex items-center justify-between p-3 bg-orion-surface-light rounded-xl">
                <div className="flex items-center gap-3">
                  <Github size={16} className="text-orion-text-muted" />
                  <div>
                    <span className="text-sm font-medium">{repo.repoFullName}</span>
                    <span className="text-xs text-orion-text-muted ml-2">{p.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSync(repo.id)}
                  disabled={syncingRepo === repo.id}
                  className="flex items-center gap-1 text-sm text-orion-primary hover:text-orion-primary-light disabled:opacity-50"
                >
                  <RefreshCw size={14} className={syncingRepo === repo.id ? 'animate-spin' : ''} />
                  {syncingRepo === repo.id ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
            )))}
          </div>
        )}
      </section>

      {/* Organization Info */}
      {org && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={24} className="text-orion-accent" />
            <div>
              <h2 className="text-lg font-semibold">{org.name}</h2>
              <p className="text-xs text-orion-text-muted">/{org.slug} &middot; {org.users?.length || 0} membros</p>
            </div>
          </div>
        </section>
      )}

      {/* Team Management (HEAD only) */}
      {user?.role === 'HEAD' && (
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users size={24} className="text-orion-primary" />
              <h2 className="text-lg font-semibold">Equipe</h2>
            </div>
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="flex items-center gap-2 text-sm text-orion-primary hover:text-orion-primary-light"
            >
              <Plus size={16} /> Novo Membro
            </button>
          </div>

          {showRegister && (
            <form onSubmit={handleRegisterUser} className="bg-orion-surface-light rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome" className="bg-orion-surface border border-orion-border rounded-lg px-3 py-2 text-sm text-orion-text focus:outline-none focus:border-orion-primary" required />
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email" className="bg-orion-surface border border-orion-border rounded-lg px-3 py-2 text-sm text-orion-text focus:outline-none focus:border-orion-primary" required />
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Senha" type="password" className="bg-orion-surface border border-orion-border rounded-lg px-3 py-2 text-sm text-orion-text focus:outline-none focus:border-orion-primary" required />
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="bg-orion-surface border border-orion-border rounded-lg px-3 py-2 text-sm text-orion-text focus:outline-none focus:border-orion-primary">
                  <option value="DEV">Dev</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={registering} className="bg-orion-primary text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {registering ? 'Adicionando...' : 'Adicionar Membro'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {org?.users?.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-orion-surface-light rounded-xl">
                <div className="w-9 h-9 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-sm font-bold">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-orion-text-muted">{u.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  u.role === 'HEAD' ? 'bg-orion-accent/20 text-orion-accent' :
                  u.role === 'ADMIN' ? 'bg-orion-purple/20 text-orion-purple' :
                  'bg-orion-primary/20 text-orion-primary-light'
                }`}>
                  {u.role}
                </span>
                {u.id !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(u.id, u.name)}
                    className="text-orion-text-muted hover:text-orion-danger transition-colors p-1"
                    title="Remover membro"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
