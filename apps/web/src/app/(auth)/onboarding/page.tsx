'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Building2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Create org
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2: Add members
  const [members, setMembers] = useState<{ name: string; email: string; password: string; role: string }[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('DEV');
  const [addingMember, setAddingMember] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.createOrganization(orgName, orgSlug);
      await refreshUser();
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAddingMember(true);

    try {
      await api.addOrgMember(memberName, memberEmail, memberPassword, memberRole);
      setMembers([...members, { name: memberName, email: memberEmail, password: memberPassword, role: memberRole }]);
      setMemberName('');
      setMemberEmail('');
      setMemberPassword('');
      setMemberRole('DEV');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setAddingMember(false);
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orion-bg p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orion-primary to-orion-purple bg-clip-text text-transparent">
            Orion
          </h1>
          <p className="text-orion-text-muted mt-2">Configure sua empresa</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-orion-primary text-white' : 'bg-orion-surface-light text-orion-text-muted'}`}>1</div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-orion-primary' : 'bg-orion-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-orion-primary text-white' : 'bg-orion-surface-light text-orion-text-muted'}`}>2</div>
        </div>

        {error && (
          <div className="bg-orion-danger/10 border border-orion-danger/30 text-orion-danger rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Create Organization */}
        {step === 1 && (
          <form onSubmit={handleCreateOrg} className="bg-orion-surface rounded-2xl p-8 border border-orion-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orion-primary/20 flex items-center justify-center">
                <Building2 size={24} className="text-orion-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Criar Empresa</h2>
                <p className="text-sm text-orion-text-muted">Dados da sua organização</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-orion-text-muted mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgSlug(generateSlug(e.target.value));
                  }}
                  className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-3 text-orion-text focus:outline-none focus:border-orion-primary transition-colors"
                  placeholder="Ex: Helsen Tech"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-orion-text-muted mb-1">Identificador (slug)</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-4 py-3 text-orion-text focus:outline-none focus:border-orion-primary transition-colors"
                  placeholder="ex: helsen-tech"
                  required
                />
                <p className="text-xs text-orion-text-muted mt-1">Apenas letras minúsculas, números e hífens</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orion-primary hover:bg-orion-primary-light text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Criando...' : 'Criar Empresa'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Add Members */}
        {step === 2 && (
          <div className="bg-orion-surface rounded-2xl p-8 border border-orion-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orion-purple/20 flex items-center justify-center">
                <Building2 size={24} className="text-orion-purple" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Adicionar Equipe</h2>
                <p className="text-sm text-orion-text-muted">Cadastre os membros da sua empresa</p>
              </div>
            </div>

            {/* Added members list */}
            {members.length > 0 && (
              <div className="space-y-2 mb-6">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-orion-surface-light rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary text-sm font-bold">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-orion-text-muted">{m.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'ADMIN' ? 'bg-orion-purple/20 text-orion-purple' : 'bg-orion-primary/20 text-orion-primary-light'}`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="Nome"
                  className="bg-orion-surface-light border border-orion-border rounded-lg px-3 py-2.5 text-sm text-orion-text focus:outline-none focus:border-orion-primary"
                  required
                />
                <input
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="bg-orion-surface-light border border-orion-border rounded-lg px-3 py-2.5 text-sm text-orion-text focus:outline-none focus:border-orion-primary"
                  required
                />
                <input
                  value={memberPassword}
                  onChange={e => setMemberPassword(e.target.value)}
                  placeholder="Senha"
                  type="password"
                  className="bg-orion-surface-light border border-orion-border rounded-lg px-3 py-2.5 text-sm text-orion-text focus:outline-none focus:border-orion-primary"
                  required
                />
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value)}
                  className="bg-orion-surface-light border border-orion-border rounded-lg px-3 py-2.5 text-sm text-orion-text focus:outline-none focus:border-orion-primary"
                >
                  <option value="DEV">Dev</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addingMember}
                className="w-full bg-orion-surface-light hover:bg-orion-border text-orion-text rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 border border-orion-border"
              >
                {addingMember ? 'Adicionando...' : '+ Adicionar Membro'}
              </button>
            </form>

            <button
              onClick={handleFinish}
              className="w-full bg-orion-primary hover:bg-orion-primary-light text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
            >
              {members.length === 0 ? 'Pular e ir para o Dashboard' : 'Concluir e ir para o Dashboard'}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        <p className="text-center text-orion-text-muted text-sm mt-4">
          Logado como <span className="text-orion-text">{user?.name}</span>
        </p>
      </div>
    </div>
  );
}
