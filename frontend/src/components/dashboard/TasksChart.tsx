"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";

interface TasksChartProps {
  pending: number;
  inProgress: number;
  completed: number;
}

export function TasksChart({ pending, inProgress, completed }: TasksChartProps) {
  const total = pending + inProgress + completed;

  const data = useMemo(() => [
    { label: "Pendentes", value: pending, color: "#f59e0b" },
    { label: "Em Andamento", value: inProgress, color: "#3b82f6" },
    { label: "Concluidas", value: completed, color: "#10b981" },
  ], [pending, inProgress, completed]);

  // Calculate percentages for the circular chart
  const getStrokeDashArray = (value: number) => {
    if (total === 0) return "0 100";
    const percentage = (value / total) * 100;
    return `${percentage} ${100 - percentage}`;
  };

  // Calculate offset for each segment
  const getStrokeDashOffset = (index: number) => {
    if (index === 0) return 25;
    let offset = 25;
    for (let i = 0; i < index; i++) {
      offset -= (data[i].value / total) * 100;
    }
    return offset;
  };

  return (
    <div className="glass-card h-full">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <PieChart className="w-5 h-5 text-orion-accent" />
          <h3 className="text-lg font-semibold text-orion-star-white">Distribuicao de Tarefas</h3>
        </div>

        <div className="flex flex-col items-center">
          {/* Circular Chart */}
          <div className="relative w-44 h-44 mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="3"
              />

              {/* Data segments */}
              {total > 0 && data.map((item, index) => (
                <circle
                  key={item.label}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={getStrokeDashArray(item.value)}
                  strokeDashoffset={getStrokeDashOffset(index)}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-orion-star-white">{total}</span>
              <span className="text-xs text-orion-star-silver/50">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full space-y-2">
            {data.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-orion-star-silver">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-orion-star-white">{item.value}</span>
                  <span className="text-xs text-orion-star-silver/50">
                    ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
