"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ListTodo } from "lucide-react";

export default function ProgrammerTasksPage() {
  const { tasks, loading, fetchMyTasks, updateTaskStatus } = useTasks();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTaskStatus(taskId, status as any);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      fetchMyTasks();
    } else {
      fetchMyTasks(value);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Minhas Tarefas</h1>
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="w-12 h-12" />}
          title="Nenhuma tarefa encontrada"
          description="Voce sera notificado quando receber novas tarefas"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              canChangeStatus={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
