'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orion-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orion-primary to-orion-purple bg-clip-text text-transparent">
            Orion
          </h1>
          <p className="text-orion-text-muted mt-2">Sistema de Gestão de Projetos</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-orion-surface rounded-2xl p-8 border border-orion-border">
          <h2 className="text-xl font-semibold mb-6">Entrar</h2>

          {error && (
            <div className="bg-orion-danger/10 border border-orion-danger/30 text-orion-danger rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-3 text-orion-text focus:outline-none focus:border-orion-primary transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-3 text-orion-text focus:outline-none focus:border-orion-primary transition-colors"
                placeholder="••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orion-primary hover:bg-orion-primary-light text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className="text-center text-orion-text-muted text-sm mt-4">
          Orion v1.0 &middot; Gestão inteligente de equipes
        </p>
      </div>
    </div>
  );
}
