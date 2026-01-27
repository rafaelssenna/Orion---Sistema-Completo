"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        // Todos os outros roles (programador, marketing, administrativo, designer) vão para /employee
        router.push("/employee");
      }
    } catch (err) {
      setError("Email ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orion-space relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="nebula-glow" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Logo"
              width={100}
              height={100}
            />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">ORION</h1>
          <p className="text-orion-star-silver/60 text-sm">Sistema de Gestao de Projetos</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-orion-accent" />
            <h2 className="text-xl font-semibold text-orion-star-white">Acesse sua conta</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-orion-star-silver">
                <Mail className="w-4 h-4 text-orion-accent" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-orion-star-silver">
                <Lock className="w-4 h-4 text-orion-accent" />
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-orion-star-silver/40 text-xs mt-8">
          Sistema Orion v1.0
        </p>
      </div>
    </div>
  );
}
