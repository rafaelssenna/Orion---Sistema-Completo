'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Lightbulb, Plus, ThumbsUp, Trash2, ArrowUpDown, Rocket, Wrench, Sparkles, HelpCircle } from 'lucide-react';

const CATEGORIES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  saas: { label: 'Novo SaaS', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: Rocket },
  feature: { label: 'Feature', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: Sparkles },
  improvement: { label: 'Melhoria', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Wrench },
  other: { label: 'Outro', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: HelpCircle },
};

export default function IdeasPage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'recent' | 'votes'>('recent');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('saas');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, [sort]);

  const loadIdeas = async () => {
    try {
      const data = await api.getIdeas(sort);
      setIdeas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.createIdea({ title, description, category });
      setTitle('');
      setDescription('');
      setCategory('saas');
      setShowForm(false);
      loadIdeas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (ideaId: string) => {
    try {
      await api.toggleIdeaVote(ideaId);
      setIdeas(prev => prev.map(idea => {
        if (idea.id !== ideaId) return idea;
        const wasVoted = idea.hasVoted;
        return {
          ...idea,
          hasVoted: !wasVoted,
          votes: wasVoted ? idea.votes - 1 : idea.votes + 1,
        };
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta ideia?')) return;
    try {
      await api.deleteIdea(id);
      setIdeas(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-orion-primary">Carregando...</div></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orion-accent/20 flex items-center justify-center">
            <Lightbulb size={22} className="text-orion-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Caixinha de Ideias</h1>
            <p className="text-sm text-orion-text-muted">Registre ideias de novos SaaS e vote nas melhores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSort(sort === 'recent' ? 'votes' : 'recent')}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-orion-surface border border-orion-border text-orion-text-muted hover:text-orion-text transition-colors"
          >
            <ArrowUpDown size={14} />
            {sort === 'recent' ? 'Recentes' : 'Mais votadas'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-orion-accent hover:bg-orion-accent/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nova Ideia
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-orion-surface rounded-2xl border border-orion-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-orion-text-muted mb-1.5">Título da ideia</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: App de gestão de condomínios"
              className="w-full bg-orion-surface-light border border-orion-border rounded-xl px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-orion-text-muted mb-1.5">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva a ideia, o problema que resolve, o público alvo..."
              rows={4}
              className="w-full bg-orion-surface-light border border-orion-border rounded-xl px-4 py-2.5 text-orion-text focus:outline-none focus:border-orion-accent resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-orion-text-muted mb-1.5">Categoria</label>
            <div className="flex gap-2">
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const Icon = cat.icon;
                const isSelected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border"
                    style={isSelected
                      ? { backgroundColor: cat.bg, borderColor: cat.color, color: cat.color }
                      : { borderColor: 'var(--orion-border, #1e3a5f)', color: 'var(--orion-text-muted, #94a3b8)' }
                    }
                  >
                    <Icon size={14} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-orion-text-muted hover:text-orion-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="bg-orion-accent hover:bg-orion-accent/80 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Publicando...' : 'Publicar Ideia'}
            </button>
          </div>
        </form>
      )}

      {/* Ideas list */}
      {ideas.length === 0 && (
        <div className="text-center py-16">
          <Lightbulb size={48} className="mx-auto text-orion-text-muted/30 mb-4" />
          <p className="text-orion-text-muted">Nenhuma ideia registrada ainda.</p>
          <p className="text-sm text-orion-text-muted/60 mt-1">Seja o primeiro a compartilhar uma ideia!</p>
        </div>
      )}

      <div className="space-y-3">
        {ideas.map((idea) => {
          const cat = CATEGORIES[idea.category] || CATEGORIES.other;
          const CatIcon = cat.icon;
          const isAuthor = idea.authorId === user?.id;
          const canDelete = isAuthor || user?.role === 'HEAD' || user?.role === 'ADMIN';

          return (
            <div key={idea.id} className="bg-orion-surface rounded-2xl border border-orion-border p-5 flex gap-4">
              {/* Vote button */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleVote(idea.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    idea.hasVoted
                      ? 'bg-orion-primary text-white'
                      : 'bg-orion-surface-light text-orion-text-muted hover:text-orion-primary hover:bg-orion-primary/10'
                  }`}
                >
                  <ThumbsUp size={18} />
                </button>
                <span className={`text-sm font-bold ${idea.hasVoted ? 'text-orion-primary' : 'text-orion-text-muted'}`}>
                  {idea.votes}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    <CatIcon size={10} />
                    {cat.label}
                  </span>
                </div>
                <h3 className="text-base font-semibold mb-1">{idea.title}</h3>
                <p className="text-sm text-orion-text-muted leading-relaxed">{idea.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-[10px] font-bold">
                      {idea.author?.name?.charAt(0)}
                    </div>
                    <span className="text-xs text-orion-text-muted">{idea.author?.name}</span>
                    <span className="text-xs text-orion-text-muted/40">
                      {idea.author?.role === 'HEAD' ? 'Head' : idea.author?.role === 'ADMIN' ? 'Admin' : 'Dev'}
                    </span>
                  </div>
                  <span className="text-xs text-orion-text-muted/40">
                    {new Date(idea.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="ml-auto text-orion-text-muted/40 hover:text-orion-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
