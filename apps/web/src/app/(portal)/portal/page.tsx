'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, ArrowUpCircle, Wrench, LogOut, ChevronDown, Zap, Shield, Rocket } from 'lucide-react';

const CATEGORY_CONFIG = {
  feature: {
    icon: CheckCircle,
    color: 'text-orion-success',
    bg: 'bg-orion-success/10',
    border: 'border-orion-success/20',
    label: 'Funcionalidades Entregues',
    cardLabel: 'Entregues',
  },
  improvement: {
    icon: ArrowUpCircle,
    color: 'text-orion-primary-light',
    bg: 'bg-orion-primary/10',
    border: 'border-orion-primary/20',
    label: 'Melhorias Aplicadas',
    cardLabel: 'Melhorias',
  },
  fix: {
    icon: Wrench,
    color: 'text-orion-accent',
    bg: 'bg-orion-accent/10',
    border: 'border-orion-accent/20',
    label: 'Correções Resolvidas',
    cardLabel: 'Correções',
  },
};

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [allActivities, setAllActivities] = useState<any[]>([]);

  const clientToken = typeof window !== 'undefined' ? localStorage.getItem('orion_client_token') : null;
  const projectName = typeof window !== 'undefined' ? localStorage.getItem('orion_client_project') : '';
  const clientName = typeof window !== 'undefined' ? localStorage.getItem('orion_client_name') : '';
  const orgName = typeof window !== 'undefined' ? localStorage.getItem('orion_client_org') : '';

  useEffect(() => {
    if (!clientToken) {
      router.replace('/');
      return;
    }
    loadPortal();
  }, [clientToken]);

  const loadPortal = async () => {
    try {
      const result = await api.getPortalProject(clientToken!);
      setData(result);
      setAllActivities(result.activities);
      setPage(1);
    } catch {
      // Token expired or invalid
      localStorage.removeItem('orion_client_token');
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!data || page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await api.getPortalProjectPage(clientToken!, nextPage);
      setAllActivities(prev => [...prev, ...result.activities]);
      setPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('orion_client_token');
    localStorage.removeItem('orion_client_project');
    localStorage.removeItem('orion_client_name');
    localStorage.removeItem('orion_client_org');
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-orion-primary text-lg">Carregando portal...</div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, statusLabel } = data;
  const statusColor = data.project.status === 'ACTIVE' ? 'text-orion-success' : data.project.status === 'PAUSED' ? 'text-orion-warning' : 'text-orion-primary';
  const statusDot = data.project.status === 'ACTIVE' ? 'bg-orion-success' : data.project.status === 'PAUSED' ? 'bg-orion-warning' : 'bg-orion-primary';

  return (
    <div className="min-h-screen bg-orion-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-orion-surface/80 backdrop-blur-xl border-b border-orion-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold bg-gradient-to-r from-orion-primary to-orion-purple bg-clip-text text-transparent">
              Orion
            </h1>
            <div className="h-5 w-px bg-orion-border" />
            <span className="text-sm font-medium">{projectName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-orion-text-muted hidden sm:block">
              {clientName}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-orion-text-muted hover:text-orion-text transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Status */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orion-surface border border-orion-border`}>
            <div className={`w-2.5 h-2.5 rounded-full ${statusDot} animate-pulse`} />
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          {data.project.description && (
            <p className="text-orion-text-muted text-sm max-w-xl mx-auto">{data.project.description}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-orion-surface rounded-2xl border border-orion-border p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <Rocket size={22} className="text-orion-success" />
            </div>
            <p className="text-2xl font-bold">{stats.features}</p>
            <p className="text-xs text-orion-text-muted mt-1">{CATEGORY_CONFIG.feature.cardLabel}</p>
          </div>
          <div className="bg-orion-surface rounded-2xl border border-orion-border p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap size={22} className="text-orion-primary-light" />
            </div>
            <p className="text-2xl font-bold">{stats.improvements}</p>
            <p className="text-xs text-orion-text-muted mt-1">{CATEGORY_CONFIG.improvement.cardLabel}</p>
          </div>
          <div className="bg-orion-surface rounded-2xl border border-orion-border p-5 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield size={22} className="text-orion-accent" />
            </div>
            <p className="text-2xl font-bold">{stats.fixes}</p>
            <p className="text-xs text-orion-text-muted mt-1">{CATEGORY_CONFIG.fix.cardLabel}</p>
          </div>
        </div>

        {/* Activities Feed */}
        <section className="bg-orion-surface rounded-2xl border border-orion-border p-6">
          <h2 className="text-lg font-semibold mb-5">Atividades do Projeto</h2>

          {allActivities.length === 0 ? (
            <p className="text-orion-text-muted text-center py-8">
              As atividades do projeto aparecerão aqui conforme o desenvolvimento avança.
            </p>
          ) : (
            <div className="space-y-1">
              {allActivities.map((activity: any, i: number) => {
                const config = CATEGORY_CONFIG[activity.category as keyof typeof CATEGORY_CONFIG];
                const Icon = config.icon;

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3.5 rounded-xl ${config.bg} border ${config.border} transition-all`}
                  >
                    <Icon size={18} className={`${config.color} mt-0.5 shrink-0`} />
                    <p className="text-sm leading-relaxed">{activity.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {data.totalPages > page && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orion-surface-light border border-orion-border text-sm text-orion-text-muted hover:text-orion-text hover:border-orion-primary/30 transition-all disabled:opacity-50"
              >
                <ChevronDown size={16} />
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center pb-8">
          <p className="text-sm text-orion-text-muted">
            {orgName} &middot; Seu projeto está em boas mãos
          </p>
        </footer>
      </main>
    </div>
  );
}
