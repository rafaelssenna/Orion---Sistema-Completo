"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecentActivity as RecentActivityType } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle, FolderPlus, Clock, Zap } from "lucide-react";

export function RecentActivity() {
  const [activities, setActivities] = useState<RecentActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await api.get<RecentActivityType[]>(
          "/dashboard/recent-activity?limit=5"
        );
        setActivities(data);
      } catch (error) {
        console.error("Erro ao carregar atividades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "task_completed":
        return (
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      case "project_created":
        return (
          <div className="p-2 rounded-xl bg-orion-accent/15 text-orion-accent">
            <FolderPlus className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="glass-card h-full">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-orion-accent" />
            <h3 className="text-lg font-semibold text-orion-star-white">Atividades Recentes</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-orion-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card h-full">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-orion-accent" />
          <h3 className="text-lg font-semibold text-orion-star-white">Atividades Recentes</h3>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 transition-all duration-300 group"
            >
              <div className="transition-transform group-hover:scale-110">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-orion-star-white">{activity.description}</p>
                <p className="text-xs text-orion-star-silver/50 mt-1">
                  por <span className="text-orion-accent-light">{activity.user_name}</span> - {formatDateTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orion-star-silver/30" />
              </div>
              <p className="text-orion-star-silver/50">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
