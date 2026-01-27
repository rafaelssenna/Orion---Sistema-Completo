"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { ProjectDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { ProjectForm } from "@/components/projects/ProjectForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const { getProject, updateProject, deleteProject } = useProjects();
  const { createTask } = useTasks();
  const { programmers } = useUsers();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProject = async () => {
    const data = await getProject(projectId);
    setProject(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleUpdateProject = async (data: any) => {
    setIsSubmitting(true);
    try {
      await updateProject(projectId, data);
      await fetchProject();
      setShowEditForm(false);
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      try {
        await deleteProject(projectId);
        router.push("/admin/projects");
      } catch (error) {
        console.error("Erro ao excluir projeto:", error);
      }
    }
  };

  const handleCreateTask = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createTask({ ...data, project_id: projectId });
      await fetchProject();
      setShowTaskForm(false);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Projeto nao encontrado</p>
        <Button variant="link" onClick={() => router.push("/admin/projects")}>
          Voltar para projetos
        </Button>
      </div>
    );
  }

  const statusVariant = project.status === "em_andamento" ? "default" : "success";
  const statusLabel = project.status === "em_andamento" ? "Em Andamento" : "Finalizado";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/admin/projects")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="text-gray-500">
            Criado em {formatDate(project.created_at)} por {project.creator.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descricao</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tarefas</CardTitle>
              <Button size="sm" onClick={() => setShowTaskForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </CardHeader>
            <CardContent>
              {project.tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma tarefa cadastrada
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task as any}
                      showProject={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Estatisticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes</span>
                <span className="font-semibold text-yellow-600">
                  {project.task_stats?.pending || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Em Andamento</span>
                <span className="font-semibold text-blue-600">
                  {project.task_stats?.in_progress || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concluidas</span>
                <span className="font-semibold text-green-600">
                  {project.task_stats?.completed || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            onSubmit={handleUpdateProject}
            onCancel={() => setShowEditForm(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            projects={[project]}
            programmers={programmers}
            onSubmit={handleCreateTask}
            onCancel={() => setShowTaskForm(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
