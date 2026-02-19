'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, 'HEAD');
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
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
          <p className="text-orion-text-muted mt-2">Crie sua conta de Head</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="bg-orion-surface rounded-2xl p-8 border border-orion-border">
          <h2 className="text-xl font-semibold mb-6">Criar Conta</h2>

          {error && (
            <div className="bg-orion-danger/10 border border-orion-danger/30 text-orion-danger rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-orion-text-muted mb-1">Seu Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-3 text-orion-text focus:outline-none focus:border-orion-primary transition-colors"
                placeholder="João Silva"
                required
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orion-primary hover:bg-orion-primary-light text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </form>

        <p className="text-center text-orion-text-muted text-sm mt-4">
          Já tem conta?{' '}
          <a href="/login" className="text-orion-primary hover:text-orion-primary-light transition-colors">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}
