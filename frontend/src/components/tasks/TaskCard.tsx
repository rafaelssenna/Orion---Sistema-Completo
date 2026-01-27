"use client";

import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { Task } from "@/types";
import { Calendar, FolderKanban, Play, CheckCircle, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: number, status: string) => void;
  showProject?: boolean;
  canChangeStatus?: boolean;
}

export function TaskCard({ task, onStatusChange, showProject = true, canChangeStatus = false }: TaskCardProps) {
  const handleStartTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, "em_andamento");
    }
  };

  const handleCompleteTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, "concluida");
    }
  };

  return (
    <div className="glass-card h-full">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-medium text-orion-star-white line-clamp-2">
            {task.title}
          </h3>
          <TaskStatusBadge status={task.status} />
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-orion-star-silver/70 text-sm mb-4 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Meta info */}
        <div className="space-y-2 mb-4">
          {showProject && task.project && (
            <div className="flex items-center gap-2 text-xs text-orion-star-silver/60">
              <FolderKanban className="w-3.5 h-3.5 text-orion-accent" />
              <span>{task.project.name}</span>
            </div>
          )}

          {task.assignee && (
            <div className="flex items-center gap-2 text-xs text-orion-star-silver/60">
              <User className="w-3.5 h-3.5 text-orion-nebula-400" />
              <span>{task.assignee.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-orion-star-silver/50">
            <Calendar className="w-3.5 h-3.5" />
            <span>Criada em {formatDate(task.created_at)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {canChangeStatus && onStatusChange && task.status !== "concluida" && (
          <div className="flex gap-2 pt-3 border-t border-white/5">
            {task.status === "pendente" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartTask}
                className="flex-1"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Iniciar
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleCompleteTask}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Concluir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
