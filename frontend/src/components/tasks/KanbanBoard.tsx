"use client";

import { useState } from "react";
import { Task, TaskPriority } from "@/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { Clock, User, FolderKanban, GripVertical, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: number, status: "pendente" | "em_andamento" | "concluida") => Promise<void>;
  onTaskClick?: (task: Task) => void;
  isLoading?: boolean;
}

type ColumnStatus = "pendente" | "em_andamento" | "concluida";

const columns: { status: ColumnStatus; title: string; color: string }[] = [
  { status: "pendente", title: "Pendentes", color: "border-amber-500/30" },
  { status: "em_andamento", title: "Em Andamento", color: "border-orion-accent/30" },
  { status: "concluida", title: "Concluidas", color: "border-emerald-500/30" },
];

const priorityConfig: Record<TaskPriority, { color: string; bgColor: string }> = {
  baixa: { color: "text-gray-400", bgColor: "bg-gray-400/10" },
  media: { color: "text-blue-400", bgColor: "bg-blue-400/10" },
  alta: { color: "text-orange-400", bgColor: "bg-orange-400/10" },
  urgente: { color: "text-red-400", bgColor: "bg-red-400/10" },
};

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "concluida") return false;
  return new Date(dueDate) < new Date();
}

export function KanbanBoard({ tasks, onStatusChange, onTaskClick, isLoading }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== status) {
      await onStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTasksByStatus = (status: ColumnStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.status);
        const isDragOver = dragOverColumn === column.status;

        return (
          <div
            key={column.status}
            className={`flex flex-col rounded-lg border-2 ${column.color} bg-orion-dark/20 transition-colors ${
              isDragOver ? "bg-orion-accent/10 border-orion-accent/50" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-orion-star-white">{column.title}</h3>
                <span className="text-sm text-orion-silver bg-white/5 px-2 py-0.5 rounded">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-orion-silver/40 text-sm">
                  Nenhuma tarefa
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!isLoading}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick?.(task)}
                    className={`bg-orion-dark/50 rounded-lg p-3 cursor-pointer hover:bg-orion-dark/70 transition-all border border-white/5 hover:border-white/10 ${
                      draggedTask?.id === task.id ? "opacity-50" : ""
                    } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
                  >
                    {/* Drag handle */}
                    <div className="flex items-start gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-orion-silver/30 mt-0.5 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-orion-star-white line-clamp-2">
                          {task.title}
                        </h4>
                      </div>
                    </div>

                    {/* Priority badge */}
                    {task.priority && (
                      <div className="mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${priorityConfig[task.priority].bgColor} ${priorityConfig[task.priority].color}`}
                        >
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-orion-silver/60">
                      {task.project && (
                        <div className="flex items-center gap-1.5">
                          <FolderKanban className="w-3 h-3 text-orion-accent" />
                          <span className="truncate">{task.project.name}</span>
                        </div>
                      )}

                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-blue-400" />
                          <span className="truncate">{task.assignee.name}</span>
                        </div>
                      )}

                      {task.due_date && (
                        <div
                          className={`flex items-center gap-1.5 ${
                            isOverdue(task.due_date, task.status) ? "text-red-400" : ""
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date, task.status) && " (Atrasada)"}
                          </span>
                        </div>
                      )}

                      {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3" />
                          <span>{task.comments.length} comentario(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
