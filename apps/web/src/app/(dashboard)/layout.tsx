'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
      const interval = setInterval(() => {
        api.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orion-bg">
        <div className="animate-pulse text-orion-primary text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orion-bg">
      <Sidebar />
      <div className="ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-orion-bg/80 backdrop-blur-sm border-b border-orion-border px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-orion-text-muted">Bem-vindo de volta,</p>
            <h2 className="text-lg font-semibold">{user.name}</h2>
          </div>
          <button className="relative p-2 text-orion-text-muted hover:text-orion-text transition-colors">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orion-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
