'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Github, RefreshCw, Link as LinkIcon, Users, Plus } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // GitHub connect
  const [connectProjectId, setConnectProjectId] = useState('');
  const [repoName, setRepoName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
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
        const usrs = await api.getUsers();
        setUsers(usrs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectProjectId || !repoName.trim()) return;
    setConnecting(true);
    setMessage('');

    try {
      await api.connectRepo(connectProjectId, repoName);
      setMessage('Repositório conectado com sucesso!');
      setRepoName('');
      loadData();
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setConnecting(false);
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

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setMessage('');

    try {
      await api.register(newName, newEmail, newPassword, newRole);
      setMessage(`Usuário ${newName} criado com sucesso!`);
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
        <p className="text-sm text-orion-text-muted mb-4">
          Conecte repositórios do GitHub aos projetos para tracking automático de commits com análise de IA.
        </p>

        <form onSubmit={handleConnectRepo} className="flex gap-3 mb-6">
          <select
            value={connectProjectId}
            onChange={e => setConnectProjectId(e.target.value)}
            className="bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
            required
          >
            <option value="">Projeto...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            value={repoName}
            onChange={e => setRepoName(e.target.value)}
            placeholder="org/repo-name"
            className="flex-1 bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-primary"
            required
          />
          <button
            type="submit"
            disabled={connecting}
            className="bg-orion-primary hover:bg-orion-primary-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <LinkIcon size={16} />
            {connecting ? 'Conectando...' : 'Conectar'}
          </button>
        </form>

        {/* Connected repos */}
        <div className="space-y-2">
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
      </section>

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
                  <option value="HEAD">Head</option>
                </select>
              </div>
              <button type="submit" disabled={registering} className="bg-orion-primary text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {registering ? 'Criando...' : 'Criar Membro'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {users.map(u => (
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
