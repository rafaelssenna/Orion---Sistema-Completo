'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Activity,
  Bell,
  Settings,
  LogOut,
  Github,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/activities', label: 'Atividades', icon: Activity },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-orion-surface border-r border-orion-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-orion-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orion-primary to-orion-purple bg-clip-text text-transparent">
          Orion
        </h1>
        <p className="text-xs text-orion-text-muted mt-1">Gestão de Projetos</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orion-primary/10 text-orion-primary-light border border-orion-primary/20'
                  : 'text-orion-text-muted hover:text-orion-text hover:bg-orion-surface-light'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-orion-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-orion-primary/20 flex items-center justify-center text-orion-primary font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-orion-text-muted">
              {user?.role === 'HEAD' ? 'Head' : user?.role === 'ADMIN' ? 'Admin' : 'Dev'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-orion-text-muted hover:text-orion-danger transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
