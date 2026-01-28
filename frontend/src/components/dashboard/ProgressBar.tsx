"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "accent" | "nebula" | "cosmic" | "success" | "warning";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  accent: "from-orion-accent to-orion-accent-light",
  nebula: "from-blue-500 to-blue-400",
  cosmic: "from-purple-500 to-purple-400",
  success: "from-emerald-500 to-emerald-400",
  warning: "from-amber-500 to-amber-400",
};

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3",
};

export function ProgressBar({
  value,
  max = 100,
  color = "accent",
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-orion-star-silver/70">Progresso</span>
          <span className="text-xs font-medium text-orion-star-white">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-white/5 overflow-hidden", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
