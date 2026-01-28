"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCard } from "@/components/tasks/TaskCard";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskComments } from "@/components/tasks/TaskComments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ListTodo, LayoutGrid, Columns3 } from "lucide-react";
import { Task, TaskComment } from "@/types";

type ViewMode = "grid" | "kanban";

export default function ProgrammerTasksPage() {
  const { tasks, loading, fetchMyTasks, updateTaskStatus, getComments, addComment, editComment, deleteComment } = useTasks();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleStatusChange = async (taskId: number, status: "pendente" | "em_andamento" | "concluida") => {
    try {
      await updateTaskStatus(taskId, status);
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

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    setLoadingComments(true);
    try {
      const comments = await getComments(task.id);
      setTaskComments(comments);
    } catch (error) {
      console.error("Erro ao carregar comentarios:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!selectedTask) return;
    const newComment = await addComment(selectedTask.id, content);
    setTaskComments((prev) => [...prev, newComment]);
  };

  const handleEditComment = async (commentId: number, content: string) => {
    const updated = await editComment(commentId, content);
    setTaskComments((prev) =>
      prev.map((c) => (c.id === commentId ? updated : c))
    );
  };

  const handleDeleteComment = async (commentId: number) => {
    await deleteComment(commentId);
    setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
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
        <div className="flex gap-4 items-center">
          {/* View toggle */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
                viewMode === "grid"
                  ? "bg-orion-accent text-white"
                  : "text-orion-silver hover:bg-white/5"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-orion-accent text-white"
                  : "text-orion-silver hover:bg-white/5"
              }`}
            >
              <Columns3 className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {viewMode === "grid" && (
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
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="w-12 h-12" />}
          title="Nenhuma tarefa encontrada"
          description="Voce sera notificado quando receber novas tarefas"
        />
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          isLoading={loading}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div key={task.id} onClick={() => handleTaskClick(task)} className="cursor-pointer">
              <TaskCard
                task={task}
                onStatusChange={handleStatusChange}
                canChangeStatus={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              {/* Task info */}
              <div className="space-y-3">
                {selectedTask.description && (
                  <p className="text-orion-silver">{selectedTask.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-orion-silver/60">Status:</span>
                    <span className="ml-2 capitalize">{selectedTask.status.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-orion-silver/60">Prioridade:</span>
                    <span className="ml-2 capitalize">{selectedTask.priority}</span>
                  </div>
                  {selectedTask.project && (
                    <div>
                      <span className="text-orion-silver/60">Projeto:</span>
                      <span className="ml-2">{selectedTask.project.name}</span>
                    </div>
                  )}
                  {selectedTask.due_date && (
                    <div>
                      <span className="text-orion-silver/60">Entrega:</span>
                      <span className="ml-2">{new Date(selectedTask.due_date).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments section */}
              <div className="border-t border-white/5 pt-4">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <TaskComments
                    comments={taskComments}
                    currentUserId={user?.id || 0}
                    isAdmin={false}
                    onAddComment={handleAddComment}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
