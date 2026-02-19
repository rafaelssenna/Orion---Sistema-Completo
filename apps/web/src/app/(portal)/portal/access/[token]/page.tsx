'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function PortalAccessPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params.token as string;
    if (!token) return;

    const authenticate = async () => {
      try {
        const result = await api.portalAccess(token);
        // Save client session
        localStorage.setItem('orion_client_token', result.token);
        localStorage.setItem('orion_client_project', result.project.name);
        localStorage.setItem('orion_client_name', result.client.name);
        localStorage.setItem('orion_client_org', result.orgName);
        // Redirect to portal
        router.replace('/portal');
      } catch (err: any) {
        setError(err.message || 'Link inválido ou expirado');
        setLoading(false);
      }
    };

    authenticate();
  }, [params.token, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orion-danger/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold">Acesso Negado</h1>
          <p className="text-orion-text-muted">{error}</p>
          <p className="text-sm text-orion-text-muted">Entre em contato com a empresa para obter um novo link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orion-primary to-orion-purple bg-clip-text text-transparent">
            Orion
          </h1>
        </div>
        <p className="text-orion-text-muted">Acessando portal do projeto...</p>
      </div>
    </div>
  );
}
