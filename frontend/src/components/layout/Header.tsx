"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Bell, Search, Star } from "lucide-react";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-orion-dark/50 backdrop-blur-xl border-b border-orion-nebula-900/30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-orion-star-white flex items-center gap-2">
            <Star className="w-4 h-4 text-orion-star-gold animate-pulse" />
            Bem-vindo, {user?.name?.split(" ")[0]}!
          </h2>
          <p className="text-sm text-orion-star-silver/50">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orion-star-silver/50" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-64 pl-10 pr-4 py-2 text-sm rounded-xl bg-orion-space/50 border border-orion-nebula-900/30 text-orion-star-white placeholder:text-orion-star-silver/30 focus:border-orion-nebula-500/50 focus:ring-0 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 text-orion-star-silver/70 hover:text-orion-nebula-400 rounded-xl hover:bg-orion-nebula-900/20 transition-all duration-300 border border-transparent hover:border-orion-nebula-500/20">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orion-nebula-500 rounded-full animate-pulse" />
        </button>
      </div>
    </header>
  );
}
