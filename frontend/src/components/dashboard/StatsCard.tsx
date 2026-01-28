import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: "accent" | "nebula" | "cosmic" | "success" | "warning" | "cyan";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  accent: {
    icon: "bg-orion-accent/15",
    iconColor: "text-orion-accent",
    bar: "from-orion-accent to-orion-accent-light",
  },
  nebula: {
    icon: "bg-blue-500/15",
    iconColor: "text-blue-400",
    bar: "from-blue-500 to-blue-400",
  },
  cosmic: {
    icon: "bg-purple-500/15",
    iconColor: "text-purple-400",
    bar: "from-purple-500 to-purple-400",
  },
  success: {
    icon: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    bar: "from-emerald-500 to-emerald-400",
  },
  warning: {
    icon: "bg-amber-500/15",
    iconColor: "text-amber-400",
    bar: "from-amber-500 to-amber-400",
  },
  cyan: {
    icon: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
    bar: "from-cyan-500 to-cyan-400",
  },
};

export function StatsCard({ title, value, icon, color = "accent", trend }: StatsCardProps) {
  const styles = colorClasses[color];

  return (
    <div className="glass-card">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-orion-star-silver/70">{title}</p>
            <p className="text-2xl font-semibold text-orion-star-white mt-2">
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-xs text-orion-star-silver/50">vs. mes anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            styles.icon
          )}>
            <div className={styles.iconColor}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
