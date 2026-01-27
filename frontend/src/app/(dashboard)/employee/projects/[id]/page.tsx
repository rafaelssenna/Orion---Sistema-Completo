"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { ProjectDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/tasks/TaskCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ProgrammerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const { getProject } = useProjects();
  const { updateTaskStatus } = useTasks();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = async () => {
    const data = await getProject(projectId);
    setProject(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTaskStatus(taskId, status as any);
      await fetchProject();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
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
        <Button variant="link" onClick={() => router.push("/programmer/projects")}>
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
        <Button variant="ghost" onClick={() => router.push("/programmer/projects")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <p className="text-gray-500">
          Criado em {formatDate(project.created_at)}
        </p>
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
            <CardHeader>
              <CardTitle>Minhas Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              {project.tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma tarefa atribuida
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task as any}
                      onStatusChange={handleStatusChange}
                      showProject={false}
                      canChangeStatus={true}
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
    </div>
  );
}
