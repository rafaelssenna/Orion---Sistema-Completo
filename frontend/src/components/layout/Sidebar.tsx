"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  LogOut,
} from "lucide-react";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  programador: "Programador",
  marketing: "Marketing",
  administrativo: "Administrativo",
  designer: "Designer",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const navigation = isAdmin
    ? [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Projetos", href: "/admin/projects", icon: FolderKanban },
        { name: "Tarefas", href: "/admin/tasks", icon: ListTodo },
        { name: "Usuarios", href: "/admin/users", icon: Users },
      ]
    : [
        { name: "Meu Painel", href: "/employee", icon: LayoutDashboard },
        { name: "Meus Projetos", href: "/employee/projects", icon: FolderKanban },
        { name: "Minhas Tarefas", href: "/employee/tasks", icon: ListTodo },
      ];

  return (
    <aside className="w-64 sidebar flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={36}
            height={36}
          />
          <div>
            <h1 className="text-xl font-bold gradient-text">ORION</h1>
            <p className="text-xs text-orion-star-silver/50">Gestao de Projetos</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && item.href !== "/employee" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-orion-accent/10 text-orion-accent-light border border-orion-accent/20"
                  : "text-orion-star-silver/70 hover:bg-white/5 hover:text-orion-star-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all",
                isActive ? "text-orion-accent" : ""
              )} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orion-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orion-accent to-orion-accent-dark flex items-center justify-center">
            <span className="text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orion-star-white truncate">{user?.name}</p>
            <p className="text-xs text-orion-accent capitalize">{user?.role ? roleLabels[user.role] : ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
